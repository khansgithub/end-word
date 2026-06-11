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
import { DictionaryEntry, GameStateClient, GameStateEmit } from "@/shared/types";
import { isWordAlreadyUsed } from "@/shared/usedWords";
import { appendDefinitionToHistory } from "@/shared/wordDefinition";
import { isPlayerTurn, turnToPlayerIndex } from "@/shared/utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

export interface GameV2Props {
	roomId: string;
	roomName?: string | null;
	userId: string;
	gameState: GameStateClient;
	language?: "en" | "ko";
	isHost?: boolean;
	isStartingGame?: boolean;
	onStateChange: (state: GameStateClient) => void;
	onRoomClosed?: () => void;
	onStartGame?: () => void;
}

export default function GameV2({
	roomId,
	roomName = null,
	userId,
	gameState: initialState,
	language = "ko",
	isHost = false,
	isStartingGame = false,
	onStartGame,
	onStateChange,
	onRoomClosed,
}: GameV2Props) {
	const router = useRouter();
	const [gameState, dispatch] = useReducer(gameStateReducer, initialState);
	const [definitionHistory, setDefinitionHistory] = useState<DictionaryEntry[]>([]);
	const [isLeavingLobby, setIsLeavingLobby] = useState(false);
	const parentStateRef = useRef(initialState);
	const gameStateRef = useRef<GameStateEmit>(gameState);
	gameStateRef.current = gameState;

	const interactionLocked = isLeavingLobby || isStartingGame;

	/**
	 * Synchronizes the local game state with the parent component.
	 * 
	 * This function ensures any changes to the local game state are communicated back
	 * to the parent component via the `onStateChange` callback. It's wrapped in a
	 * useCallback to prevent unnecessary re-creations and to optimize performance.
	 *
	 * @param next - The updated GameStateClient to propagate to the parent.
	 */
	const syncParent = useCallback(
		(next: GameStateClient) => {
			onStateChange(next);
		},
		[onStateChange]
	);

	/**
	 * Updates the local game state in response to a remote game state emission.
	 * 
	 * `applyRemote` applies an incoming GameStateEmit update from the server (or another player)
	 * by dispatching a `gameStateUpdateClient` action to the reducer. This action merges the
	 * incoming update into the current local state, ensuring the UI stays in sync with
	 * the latest authoritative game state.
	 *
	 * @param emit - The new state emitted from the server (GameStateEmit).
	 */
	const applyRemote = useCallback(
		(emit: GameStateEmit) => {
			dispatch({
				type: "gameStateUpdateClient",
				payload: [emit],
			});
		},
		[]
	);

	const appendDefinition = useCallback((definition: DictionaryEntry) => {
		setDefinitionHistory((current) => appendDefinitionToHistory(current, definition));
	}, []);

	const multiplayer = shouldShowPlayersBar(gameState);
	const isMyTurn =
		gameState.status === "playing" &&
		gameState.thisPlayer?.seat !== undefined &&
		isPlayerTurn(gameState, gameState.thisPlayer.seat);

	const onPlayerLeft = useCallback((leavingPlayers: Array<{ userId: string; seat: number }>) => {
		const state = gameStateRef.current;
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

	const { remoteDraft, clearRemoteDraft } = useTypingDraft(roomId, {
		userId,
		isHost,
		broadcastEnabled: multiplayer && isMyTurn,
		turnSeat: gameState.thisPlayer?.seat,
		receiveEnabled: multiplayer && gameState.status === "playing",
		onUpdate: applyRemote,
		onWordDefinition: appendDefinition,
		onRoomClosed,
		onPlayerLeft,
		presenceSeat: gameState.thisPlayer?.seat,
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
				appendDefinition(response.definition);
			}
			resetInput();
		} else {
			focusInputBox();
		}
	}, [gameState, roomId, appendDefinition]);

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
						disabled={isDisabled}
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
