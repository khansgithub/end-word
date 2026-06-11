"use client";

import Definitions from "@/app/components/old/Definitions";
import GameOverlay from "@/app/components/GameOverlay";
import HealthDisplay from "@/app/components/old/HealthDisplay";
import { focusInputBox, getInputValue, resetInput, setInputError } from "@/app/components/InputBox";
import InputSection from "@/app/components/old/InputSection";
import MatchLetterDisplay from "@/app/components/old/MatchLetterDisplay";
import PlayersSection from "@/app/components/old/PlayersSection";
import { RoundNumberBadge } from "@/app/components/old/RoundNumberBadge";
import { useRoomChannel } from "@/app/hooks/useRoomChannel";
import { submitWordApi } from "@/lib/client/api/room";
import { submitWordCallback } from "@/lib/client/game/word-submit";
import { gameStrings } from "@/lib/client/ui/game-strings";
import { ThisPlayerUndefinedError } from "@/shared/errors";
import { gameStateReducer, gameStateUpdateClient } from "@/shared/GameState";
import { DictionaryEntry, GameStateClient, GameStateEmit } from "@/shared/types";
import { isWordAlreadyUsed } from "@/shared/usedWords";
import { isPlayerTurn } from "@/shared/utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";


interface GameProps {
	roomId: string;
	userId: string;
	gameState: GameStateClient;
	onStateChange: (state: GameStateClient) => void;
	onRoomClosed?: () => void;
	language?: "en" | "ko";
	isHost?: boolean;
	onStartGame?: () => void;
	isStartingGame?: boolean;
}

export default function Game({
	roomId,
	userId,
	gameState: initialState,
	onStateChange,
	onRoomClosed,
	language = "ko",
	isHost = false,
	onStartGame,
	isStartingGame = false,
}: GameProps) {
	const router = useRouter();
	const [gameState, dispatch] = useReducer(gameStateReducer, initialState);
	const [lastDefinition, setLastDefinition] = useState<DictionaryEntry | null>(null);
	const parentStateRef = useRef(initialState);
	const gameStateEmitRef = useRef<GameStateEmit | null>(null);

	const syncParent = useCallback(
		(next: GameStateClient) => {
			onStateChange(next);
		},
		[onStateChange]
	);

	const applyRemote = useCallback(
		(emit: Parameters<typeof gameStateUpdateClient>[0]) => {
			dispatch({
				type: "gameStateUpdateClient",
				payload: [emit],
			});
		},
		[]
	);

	useEffect(() => {
		const { thisPlayer, ...emit } = gameState;
		gameStateEmitRef.current = emit as GameStateEmit;
		console.log(`[useEffect.Game] updating gameStateEmitRef.current to new GameState`);
	}, [gameState]);

	const onPlayerLeft = useCallback((leavingPlayers: Array<{ userId: string; seat: number }>) => {
		const state = gameStateEmitRef.current;
		if (!state) return null;

		const newPlayers = [...state.players] as GameStateEmit["players"];
		let changed = false;

		for (const { seat } of leavingPlayers) {
			if (seat < 0 || seat >= newPlayers.length) continue;
			newPlayers[seat] = null;
			changed = true;
		}

		if (!changed) return null;

		const connectedPlayers = newPlayers.filter(
			(pl): pl is NonNullable<typeof pl> => pl !== null && !pl.left
		).length;

		return {
			...state,
			players: newPlayers,
			connectedPlayers,
		} as GameStateEmit;
	}, []);

	useRoomChannel(roomId, {
		userId,
		isHost,
		onUpdate: applyRemote,
		onRoomClosed,
		onPlayerLeft,
		presenceSeat: gameState.thisPlayer?.seat,
	});

	useEffect(() => {
		const parentChanged =
			initialState.status !== gameState.status ||
			initialState.connectedPlayers !== gameState.connectedPlayers ||
			initialState.turn !== gameState.turn ||
			initialState.matchLetter.block !== gameState.matchLetter.block;

		if (parentChanged) {
			dispatch({
				type: "replaceGameState",
				payload: [initialState],
			});
		}
	}, [
		// NOTE: causes infinite loop when correct word is submitted
		// initialState,
		// gameState.status,
		// gameState.connectedPlayers,
		// gameState.turn,
		// gameState.matchLetter.block,
	]);

	useEffect(() => {
		parentStateRef.current = initialState;
	}, [initialState]);

	useEffect(() => {
		if (gameState === parentStateRef.current) return;
		syncParent(gameState);
	}, [gameState, syncParent]);

	useEffect(() => {
		if (gameState.thisPlayer === undefined) {
			throw new ThisPlayerUndefinedError("", gameState);
		}
	}, [gameState]);

	const isDisabled =
		gameState.thisPlayer?.seat === undefined ||
		!isPlayerTurn(gameState, gameState.thisPlayer.seat) ||
		gameState.status !== "playing";

	const submitButton = useCallback(async () => {
		if (gameState.status === "finished") return;

		const word = getInputValue();
		if (!word || word.length === 0) {
			setInputError(true);
			return;
		}

		if (isWordAlreadyUsed(gameState, word)) {
			setInputError(true, gameStrings.wordAlreadyUsed);
			focusInputBox();
			return;
		}

		const response = await submitWordApi(roomId, word);
		submitWordCallback(gameState, dispatch, setInputError, response, word);
		if (response.success) {
			if (response.definition) {
				setLastDefinition(response.definition);
			}
			resetInput();
		} else {
			focusInputBox();
		}
	}, [gameState, roomId]);

	return (
		<div
			className="flex flex-col w-dvw min-h-screen items-center"
			style={{ backgroundColor: "var(--bg-primary)" }}
		>
			<div className="flex flex-col md:max-w-4xl items-center justify-center p-3 gap-3">
				<GameOverlay
					status={gameState.status}
					players={gameState.players}
					connectedPlayers={gameState.connectedPlayers}
					isHost={isHost}
					onStartGame={onStartGame}
					onBackToLobby={() => router.push("/lobby")}
					isStartingGame={isStartingGame}
				/>
				<RoundNumberBadge turn={gameState.turn ?? 1} />
				<MatchLetterDisplay matchLetter={gameState.matchLetter} />
				<HealthDisplay health={gameState.thisPlayer.health} />
				<div className="relative flex flex-col md:flex-row gap-1">
					<div className="md:w-8/12 shrink-0">
						<InputSection
							matchLetter={gameState.matchLetter}
							disabled={isDisabled}
							onSubmit={submitButton}
							language={language}
						/>
					</div>
					<div className="md:w-4/12 shrink-0" aria-hidden />
					<div className="md:absolute md:right-0 md:top-0 md:bottom-0 w-full md:w-4/12">
						<Definitions definition={lastDefinition} />
					</div>
				</div>
				<PlayersSection gameState={gameState} />
			</div>
		</div>
	);
}
