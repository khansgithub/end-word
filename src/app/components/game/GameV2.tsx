"use client";

import BusyOverlay from "@/app/components/game/BusyOverlay";
import DefinitionsPanel from "@/app/components/game/DefinitionsPanel";
import GameBoardLayout from "@/app/components/game/GameBoardLayout";
import GameOverlay from "@/app/components/game/GameOverlay";
import GameTopBar from "@/app/components/game/GameTopBar";
import {
	focusInputBox,
	getInputValue,
	resetInput,
	setInputError,
} from "@/app/components/game/InputBox";
import InputSection from "@/app/components/game/InputSection";
import PlayersRoster, {
	shouldShowPlayersBar,
} from "@/app/components/game/PlayersRoster";
import PlayFocusPanel from "@/app/components/game/PlayFocusPanel";
import PlayStatusGrid from "@/app/components/game/PlayStatusGrid";
import { useGameState } from "@/app/hooks/useGameState";
import { useRoomChannel } from "@/app/hooks/useRoomChannel";
import { useTypingDraft } from "@/app/hooks/useTypingDraft";
import {
	leaveRoomApi,
	submitWordApi,
	timerExpiryApi,
} from "@/lib/client/api/room";
import { submitWordCallback } from "@/lib/client/game/word-submit";
import { gameStrings } from "@/lib/client/ui/game-strings";
import { ThisPlayerUndefinedError } from "@/shared/errors";
import { GameStateActionsType, gameStateReducer } from "@/shared/GameState";
import { resolveGameStatus } from "@/shared/gameStatus";
import {
	DictionaryEntry,
	GameState,
	GameStateClient,
	GameStateEmit,
	Spectator,
} from "@/shared/types";
import type { TypingDraftPayload } from "@/shared/typingDraft";
import { isWordAlreadyUsed } from "@/shared/usedWords";
import {
	isPlayerTurn,
	turnToPlayerIndex,
	numberToSeconds,
} from "@/shared/utils";
import { appendDefinitionToHistory } from "@/shared/wordDefinition";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import TimerBar from "./TimerBar";
// import { useTimer } from "@/app/hooks/useTimer";
import { useTimer } from "react-timer-hook";
import { useCountdown } from "@/app/hooks/useCountdown";
import { logger } from "@/lib/client/logging";
import { ActiveEmote, EmotePayload, EMOTE_THROTTLE_MS } from "@/shared/emote";
import EmoteButton from "@/app/components/game/EmoteButton";
import EmotePicker from "@/app/components/game/EmotePicker";
import EmoteBanner from "@/app/components/game/EmoteBanner";

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
	// =========================================================================
	// # state / reducer / ref hooks + varibles
	// =========================================================================
	// ## hooks
	// =========================================================================
	const router = useRouter();
	const [gameState, gameStateDispatch] = useReducer(
		gameStateReducer,
		initialState,
	);

	const [definitionHistory, setDefinitionHistory] = useState<
		DictionaryEntry[]
	>([]);
	const [isLeavingLobby, setIsLeavingLobby] = useState(false);
	const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);
	const [emotePickerOpen, setEmotePickerOpen] = useState(false);
	const [emoteThrottled, setEmoteThrottled] = useState(false);
	const emoteBtnRef = useRef<HTMLButtonElement>(null);
	const emoteThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const sendEmoteRef = useRef<(payload: EmotePayload) => void>(() => { });

	const parentStateRef = useRef(gameState);
	const gameStateRef = useRef(gameState);
	const timerRef = useRef(gameState.timerDuration);
	const onTypingDraftRef = useRef<(payload: TypingDraftPayload) => void>(
		() => { },
	);
	const timerExpiredRef = useRef(false);
	const timerExpiredTurnRef = useRef(gameState.turn);
	const timerSyncTurnRef = useRef(-1);
	const spectatorCountRef = useRef(0);

	// =========================================================================
	// ## variables
	// =========================================================================
	const interactionLocked = isLeavingLobby || isStartingGame;
	const multiplayer = shouldShowPlayersBar(gameState);

	const turnSeat = turnToPlayerIndex(
		gameState.turn,
		gameState.connectedPlayers,
	);


	const {
		isSubmitting,
		isGamePlaying,
		isMyTurn,
		isPlayerDead,
		isInputDisabled,
		isTimerPaused,
		isSoloGame,
		playerCount,
		forceInputDisabled,
		setForceInputDisabled,
	} = useGameState(gameState);

	// =========================================================================
	// ## callback hooks
	// =========================================================================
	const L = "GameV2";

	/**
	 * handleExit handles the process of leaving the current game room.
	 * It first prevents the action if UI interaction is locked, then sets
	 * a local state to indicate the user is leaving. It calls the API to
	 * leave the room and, once complete, navigates the user back to the lobby.
	 */
	const handleExit = useCallback(() => {
		if (interactionLocked) {
			logger.debug(L, "handleExit blocked (interactionLocked)");
			return;
		}
		logger.info(L, "handleExit");
		setIsLeavingLobby(true);
		void leaveRoomApi(roomId).finally(() => {
			countdown.reset();
			router.push("/lobby");
		});
	}, [router, interactionLocked, roomId]);

	const handleEmoteReceive = useCallback((payload: EmotePayload) => {
		logger.debug(L, "handleEmoteReceive", { seat: payload.seat, value: payload.value });
		if (payload.userId === userId) return;
		setActiveEmotes((prev) => [...prev, { ...payload, id: crypto.randomUUID() }]);
	}, [userId]);

	const handleEmoteComplete = useCallback((id: string) => {
		setActiveEmotes((prev) => prev.filter((e) => e.id !== id));
	}, []);

	const handleEmoteSelect = useCallback(
		(value: string) => {
			setEmotePickerOpen(false);
			const seat = gameState.thisPlayer?.seat;
			if (seat === undefined) return;

			const payload: EmotePayload = { userId, seat, kind: "image", value };
			const activeEmote: ActiveEmote = { ...payload, id: crypto.randomUUID() };
			setActiveEmotes((prev) => [...prev, activeEmote]);
			sendEmoteRef.current(payload);

			setEmoteThrottled(true);
			if (emoteThrottleRef.current) clearTimeout(emoteThrottleRef.current);
			emoteThrottleRef.current = setTimeout(
				() => setEmoteThrottled(false),
				EMOTE_THROTTLE_MS,
			);
		},
		[userId, gameState.thisPlayer?.seat],
	);

	const handleEmoteToggle = useCallback(() => {
		if (emoteThrottled) return;
		setEmotePickerOpen((prev) => !prev);
	}, [emoteThrottled]);

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
		[onStateChange],
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
	const applyRemote = useCallback((emit: GameStateEmit) => {
		logger.info(L, "applyRemote", { turn: emit.turn, status: emit.status, connectedPlayers: emit.connectedPlayers });
		gameStateDispatch({
			type: "gameStateUpdateClient",
			payload: [emit],
		});
	}, []);

	const appendDefinition = useCallback((definition: DictionaryEntry) => {
		logger.info(L, "appendDefinition", { key: definition.key });
		setDefinitionHistory((current) =>
			appendDefinitionToHistory(current, definition),
		);
	}, []);

	/**
	 * Calculates the updated game state when one or more players leave the game.
	 *
	 * This function is typically invoked when notified that certain players have left the game.
	 * For each leaving player (specified by their seat number), the corresponding entry in the `players`
	 * array is set to `null`. If any changes occurred, a new `GameStateEmit` object is returned that reflects
	 * the updated players and the recalculated number of connected players. If no players were removed,
	 * the function returns `null`.
	 *
	 * @param leavingPlayers Array of objects representing the players who left, each containing their `userId` and `seat`.
	 * @returns An updated partial game state (`GameStateEmit`) if any player was removed, or `null` if unchanged.
	 */
	const onPlayerLeft = useCallback(
		(leavingPlayers: Array<{ userId: string; seat: number }>) => {
			const state = gameStateRef.current;
			if (!state) {
				logger.warn(L, "onPlayerLeft: no state");
				return null;
			}

			logger.info(L, "onPlayerLeft", { leaving: leavingPlayers });
			const newPlayers = [...state.players] as GameStateEmit["players"];
			let changed = false;

			for (const { seat } of leavingPlayers) {
				if (seat < 0 || seat >= newPlayers.length) continue;
				newPlayers[seat] = null;
				changed = true;
			}

			if (!changed) return null;

			const connectedPlayers = newPlayers.filter(
				(pl): pl is NonNullable<typeof pl> => pl !== null && !pl.left,
			).length;

			const newStatus = resolveGameStatus(state.status, {
				type: "PLAYER_COUNT_CHANGED",
				prev: state.connectedPlayers,
				next: connectedPlayers,
			});

			return {
				...state,
				status: newStatus,
				players: newPlayers,
				connectedPlayers,
			} as GameStateEmit;
		},
		[],
	);

	const handleTimerExpire = useCallback(() => {
		logger.warn(L, "handleTimerExpire", { playerCount, seat: gameState.thisPlayer?.seat });
		setForceInputDisabled(true);
		if (gameState.thisPlayer) {
			const seat = gameState.thisPlayer.seat;
			if (seat === undefined) {
				logger.error(L, "handleTimerExpire seat is undefined");
				return;
			}
			logger.info(L, "handleTimerExpire killing player and advancing turn");
			gameStateDispatch({
				type: "killPlayerAndNextTurn",
				payload: [gameState, seat],
			});
		}
		void timerExpiryApi(roomId).then((result) => {
			if (!result.success) {
				logger.warn(L, "handleTimerExpire server timer expiry failed", { reason: result.reason });
			}
		});
	}, [gameStateDispatch, gameState, roomId]);


	const setIsSubmitting = useCallback(
		(isSubmiting: boolean) => {
			logger.info(L, "setIsSubmitting", { submitting: isSubmiting, status: gameState.status });
			gameStateDispatch({
				type: "clientSetIsSubmitting",
				payload: [gameState, isSubmiting],
			});
		},
		[gameState, gameStateDispatch],
	);

	// =========================================================================
	// ## custom hooks
	// =========================================================================

	/**
	 * Ref bridge so `useRoomChannel` (called first) can forward incoming typing-draft
	 * broadcasts to the `onTypingDraft` callback created by `useTypingDraft` (called second).
	 */
	const { sendTypingDraft, sendTimerSync, sendTimerSyncRequest, sendEmote } = useRoomChannel(roomId, {
		userId,
		isHost,
		onUpdate: applyRemote,
		onRoomClosed,
		onTimerSyncRequest: () => {
			if (isMyTurn && gameState.status === "playing") {
				logger.info(L, "timerSync requested, sending", { remaining: countdown.remainingSeconds, paused: countdown.isPaused });
				sendTimerSync({ remaining: countdown.remainingSeconds, paused: countdown.isPaused });
			}
		},
		onSpectatorsUpdate: (spectators: Spectator[]) => {
			const prev = spectatorCountRef.current;
			spectatorCountRef.current = spectators.length;
			if (spectators.length > prev && isMyTurn && gameState.status === "playing") {
				logger.info(L, "spectator joined, broadcasting timer sync", { remaining: countdown.remainingSeconds, paused: countdown.isPaused });
				sendTimerSync({ remaining: countdown.remainingSeconds, paused: countdown.isPaused });
				setTimeout(() => {
					sendTimerSync({ remaining: countdown.remainingSeconds, paused: countdown.isPaused });
				}, 400);
			}
		},
		onTypingDraft: (payload) => {
			onTypingDraftRef.current(payload);
		},
		onEmote: handleEmoteReceive,
		onWordDefinition: appendDefinition,
		onPlayerLeft,
		presenceSeat: gameState.thisPlayer?.seat,
	});
	sendEmoteRef.current = sendEmote;
	const { remoteDraft, clearRemoteDraft, onTypingDraft } = useTypingDraft(
		roomId,
		{
			userId,
			broadcastEnabled: isMyTurn,
			turnSeat: gameState.thisPlayer?.seat,
			receiveEnabled: multiplayer && gameState.status === "playing",
			sendTypingDraft,
		},
	);
	onTypingDraftRef.current = onTypingDraft;
	const turnTypingText =
		multiplayer &&
			!isMyTurn &&
			remoteDraft?.text &&
			remoteDraft.seat === turnSeat
			? remoteDraft.text
			: undefined;

	const countdown = useCountdown(
		gameState.timerDuration,
		gameState.status,
		isTimerPaused,
	);

	const submitButton = useCallback(async () => {
		if (gameState.status === "finished") {
			logger.debug(L, "submitButton: game finished, skipping");
			return;
		}
		const word = getInputValue();
		const emptyInput = !word || word.length === 0;

		if (emptyInput) {
			logger.debug(L, "submitButton: empty input");
			setInputError(true);
			setIsSubmitting(false);
		} else if (isWordAlreadyUsed(gameState, word)) {
			logger.debug(L, "submitButton: word already used", { word });
			setInputError(true, gameStrings.wordAlreadyUsed);
			focusInputBox();
			setIsSubmitting(false);
		} else {
			logger.info(L, "submitButton submitting", { word, isMyTurn, remaining: countdown.remainingSeconds, turn: gameState.turn });
			sendTimerSync({ remaining: countdown.remainingSeconds, paused: true });
			const response = await submitWordApi(roomId, word, countdown.remainingSeconds);
			logger.info(L, "submitButton response", { success: response.success, reason: (response as any).reason, remaining: countdown.remainingSeconds });
			type CustomDispatch = {
				type: "custom",
				payload: [GameState, string[], any[][]]
			}
			const customDispatch = submitWordCallback(
				gameState,
				gameStateDispatch,
				setInputError,
				response,
				word,
			) as CustomDispatch;
			if (response.success) {
				if (response.definition) {
					appendDefinition(response.definition);
				}
				resetInput();
			} else {
				focusInputBox();
				customDispatch.payload[1].push("clientSetIsSubmitting");
				customDispatch.payload[2].push([false]);
				logger.debug(L, "submitButton wrong word, timer stays unpaused");
			}
			gameStateDispatch(customDispatch)
		}
	}, [gameState, roomId, appendDefinition, countdown.remainingSeconds, isMyTurn, isSubmitting, sendTimerSync]);

	// =========================================================================
	// effects
	// =========================================================================
	useEffect(() => {
		clearRemoteDraft();
	}, [gameState.turn, gameState.matchLetter.block, clearRemoteDraft]);

	useEffect(
		() => {
			if (initialState.status !== gameState.status) {
				gameStateDispatch({
					type: "replaceGameState",
					payload: [initialState],
				});
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[initialState.status],
	);

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
	}, [gameState.thisPlayer]);

	useEffect(() => {
		logger.debug(L, "turn/timer effect", { status: gameState.status, isMyTurn, remaining: countdown.remainingSeconds, turn: gameState.turn, isTimerPaused, timerExpired: timerExpiredRef.current });
		if (gameState.status === "playing") {
			void (isMyTurn ? countdown.start() : countdown.pause());
			if (isMyTurn && timerSyncTurnRef.current !== gameState.turn) {
				timerSyncTurnRef.current = gameState.turn;
				sendTimerSync({ remaining: countdown.remainingSeconds, paused: false });
			}
			if (countdown.remainingSeconds === 0 && !timerExpiredRef.current) {
				timerExpiredRef.current = true;
				timerExpiredTurnRef.current = gameState.turn;
				handleTimerExpire();
			} else if (countdown.remainingSeconds > 0) {
				timerExpiredRef.current = false;
			}
		} else {
			countdown.pause();
			timerExpiredRef.current = false;
		}
	}, [countdown.remainingSeconds, gameState.status, isMyTurn]);

	useEffect(() => {
		logger.debug(L, "status effect", { status: gameState.status, isMyTurn, isPaused: countdown.isPaused, remaining: countdown.remainingSeconds });
		if (gameState.status === "playing" && isMyTurn) {
			countdown.start();
		} else {
			countdown.pause();
		}
	}, [gameState.status]);

	useEffect(() => {
		if (isStartingGame) {
			countdown.reset();
		}
	}, [isStartingGame]);

	useEffect(() => {
		if (gameState.submitting) {
			logger.debug(L, "isMyTurn effect: clearing submitting", { isMyTurn, turn: gameState.turn, seat: gameState.thisPlayer?.seat });
			gameStateDispatch({
				type: "clientSetIsSubmitting",
				payload: [gameState, false],
			});
		}
	}, [isMyTurn]);

	return (
		<>
			{/*<button className="btn btn-primary" onClick={() => { console.log('[TEST] pause clicked'); setIsSubmitting(true)}}> test pause </button>
            <button className="btn btn-secondary" onClick={() => { console.log('[TEST] resume clicked'); setIsSubmitting(false)}}> test resume </button>*/}
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
				roomId={roomId}
			/>
			{/* <p> timer: {countdown.remainingSeconds}</p> */}
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
								disabled={isInputDisabled || forceInputDisabled}
								onSubmit={submitButton}
								setIsSubmitting={setIsSubmitting}
								submitState={gameState.submitting!}
								language={language}
								embedded
							/>
						}
						disabled={isInputDisabled || forceInputDisabled}
						timerBar={<TimerBar timer={countdown} isSubmitting={gameState.submitting ?? false} />}
					/>
				}
				wordHistory={
					<DefinitionsPanel
						definitions={definitionHistory}
						language={language}
					/>
				}
				playersBar={
					shouldShowPlayersBar(gameState) ? (
						<PlayersRoster
							gameState={gameState}
							turnTypingText={turnTypingText}
							activeEmotes={activeEmotes}
							onEmoteComplete={handleEmoteComplete}
						/>
					) : undefined
				}
				emoteArea={
					<div className="g2-emote-area">
						<EmoteButton
							onClick={handleEmoteToggle}
							disabled={emoteThrottled}
							buttonRef={emoteBtnRef}
						/>
						<EmotePicker
							open={emotePickerOpen}
							onSelect={handleEmoteSelect}
							onClose={() => setEmotePickerOpen(false)}
							anchorRef={emoteBtnRef}
						/>
                        {!shouldShowPlayersBar(gameState) &&
                            activeEmotes.map((em, idx) => (
                                <div
                                    key={em.id}
                                    className="g2-emote-banner-wrapper"
                                    style={{ bottom: `${4 + idx * 36}px` }}
                                >
                                    <EmoteBanner
                                        value={em.value}
                                        onComplete={() => handleEmoteComplete(em.id)}
                                    />
                                </div>
                            ))}
					</div>
				}
			/>
		</>
	);
}
