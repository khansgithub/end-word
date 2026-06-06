"use client";

import BusyOverlay from "@/app/components/BusyOverlay";
import DefinitionsPanel from "@/app/components/game-v2/DefinitionsPanel";
import GameBoardLayout from "@/app/components/game-v2/GameBoardLayout";
import GameTopBar from "@/app/components/game-v2/GameTopBar";
import InputSection from "@/app/components/game-v2/InputSection";
import PlayersRoster, { shouldShowPlayersBar } from "@/app/components/game-v2/PlayersRoster";
import PlayFocusPanel from "@/app/components/game-v2/PlayFocusPanel";
import PlayStatusGrid from "@/app/components/game-v2/PlayStatusGrid";
import GameOverlay from "@/app/components/GameOverlay";
import { focusInputBox, getInputValue, resetInput, setInputError } from "@/app/components/InputBox";
import { useTypingDraft } from "@/app/hooks/useTypingDraft";
import { leaveRoomApi, submitWordApi } from "@/lib/client/api/room";
import { submitWordCallback } from "@/lib/client/game/word-submit";
import { gameStrings } from "@/lib/client/ui/game-strings";
import { ThisPlayerUndefinedError } from "@/shared/errors";
import { gameStateReducer, gameStateUpdateClient } from "@/shared/GameState";
import { DictionaryEntry, GameStateClient } from "@/shared/types";
import { isWordAlreadyUsed } from "@/shared/usedWords";
import { isPlayerTurn, turnToPlayerIndex } from "@/shared/utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

export interface GameV2Props {
	roomId: string;
	roomName?: string | null;
	userId: string;
	gameState: GameStateClient;
	onStateChange: (state: GameStateClient) => void;
	onRoomClosed?: () => void;
	language?: "en" | "ko";
	isHost?: boolean;
	onStartGame?: () => void;
	isStartingGame?: boolean;
}

export default function GameV2({
	roomId,
	roomName = null,
	userId,
	gameState: initialState,
	onStateChange,
	onRoomClosed,
	language = "ko",
	isHost = false,
	onStartGame,
	isStartingGame = false,
}: GameV2Props) {
	const router = useRouter();
	const [gameState, dispatch] = useReducer(gameStateReducer, initialState);
	const [definitionHistory, setDefinitionHistory] = useState<DictionaryEntry[]>([]);
	const [isLeavingLobby, setIsLeavingLobby] = useState(false);
	const parentStateRef = useRef(initialState);

	const interactionLocked = isLeavingLobby || isStartingGame;

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

	const multiplayer = shouldShowPlayersBar(gameState);
	const isMyTurn =
		gameState.status === "playing" &&
		gameState.thisPlayer?.seat !== undefined &&
		isPlayerTurn(gameState, gameState.thisPlayer.seat);

	const { remoteDraft, clearRemoteDraft } = useTypingDraft(roomId, {
		userId,
		isHost,
		broadcastEnabled: multiplayer && isMyTurn,
		turnSeat: gameState.thisPlayer?.seat,
		receiveEnabled: multiplayer && gameState.status === "playing",
		onUpdate: applyRemote,
		onRoomClosed,
	});

	useEffect(() => {
		clearRemoteDraft();
	}, [gameState.turn, gameState.matchLetter.block, clearRemoteDraft]);

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
		!isMyTurn ||
		gameState.status !== "playing";

	const turnSeat = turnToPlayerIndex(gameState.turn, gameState.connectedPlayers);
	const turnTypingText =
		multiplayer &&
		!isMyTurn &&
		remoteDraft?.text &&
		remoteDraft.seat === turnSeat
			? remoteDraft.text
			: undefined;

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
				setDefinitionHistory((current) => {
					const deduped = new Map(current.map((entry) => [entry.key, entry]));
					deduped.set(response.definition.key, response.definition);
					return Array.from(deduped.values());
				});
			}
			resetInput();
		} else {
			focusInputBox();
		}
	}, [gameState, roomId]);

	const handleExit = useCallback(() => {
		if (interactionLocked) return;
		setIsLeavingLobby(true);
		void leaveRoomApi(roomId).finally(() => {
			router.push("/lobby");
		});
	}, [router, interactionLocked, roomId]);

	return (
		<>
			{gameState.status === "playing" && isLeavingLobby && (
				<BusyOverlay message={gameStrings.leavingRoom} />
			)}
			<GameOverlay
				status={gameState.status}
				players={gameState.players}
				connectedPlayers={gameState.connectedPlayers}
				isHost={isHost}
				onStartGame={onStartGame}
				onBackToLobby={handleExit}
				isStartingGame={isStartingGame}
				isLeavingLobby={isLeavingLobby}
			/>
			<GameBoardLayout
				topBar={
					<GameTopBar
						turn={gameState.turn ?? 1}
						roomName={roomName}
						onExit={handleExit}
						exitDisabled={interactionLocked}
					/>
				}
				playFocus={
					<PlayFocusPanel
						status={
							<PlayStatusGrid
								matchLetter={gameState.matchLetter}
								yourHealth={gameState.thisPlayer.health}
								yourName={gameState.thisPlayer.name}
							/>
						}
						input={
							<InputSection
								matchLetter={gameState.matchLetter}
								disabled={isDisabled}
								onSubmit={submitButton}
								language={language}
								embedded
							/>
						}
					/>
				}
				wordHistory={<DefinitionsPanel definitions={definitionHistory} language={language} />}
				playersBar={
					shouldShowPlayersBar(gameState) ? (
						<PlayersRoster gameState={gameState} turnTypingText={turnTypingText} />
					) : undefined
				}
			/>
		</>
	);
}
