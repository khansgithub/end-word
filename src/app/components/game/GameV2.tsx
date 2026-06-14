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
import { gameStateReducer } from "@/shared/GameState";
import {
    DictionaryEntry,
    GameStateClient,
    GameStateEmit,
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
import { count } from "node:console";

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

    const parentStateRef = useRef(gameState);
    const gameStateRef = useRef(gameState);
    const timerRef = useRef(gameState.timerDuration);
    const onTypingDraftRef = useRef<(payload: TypingDraftPayload) => void>(
        () => {},
    );
    const timerExpiredRef = useRef(false);
    const timerExpiredTurnRef = useRef(gameState.turn);

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
    /**
     * handleExit handles the process of leaving the current game room.
     * It first prevents the action if UI interaction is locked, then sets
     * a local state to indicate the user is leaving. It calls the API to
     * leave the room and, once complete, navigates the user back to the lobby.
     */
    const handleExit = useCallback(() => {
        if (interactionLocked) return;
        setIsLeavingLobby(true);
        void leaveRoomApi(roomId).finally(() => {
            countdown.reset();
            router.push("/lobby");
        });
    }, [router, interactionLocked, roomId]);

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
        gameStateDispatch({
            type: "gameStateUpdateClient",
            payload: [emit],
        });
    }, []);

    const appendDefinition = useCallback((definition: DictionaryEntry) => {
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
                (pl): pl is NonNullable<typeof pl> => pl !== null && !pl.left,
            ).length;

            return {
                ...state,
                players: newPlayers,
                connectedPlayers,
            } as GameStateEmit;
        },
        [],
    );

    const handleTimerExpire = useCallback(() => {
        // alert("YOU DIED");
        setForceInputDisabled(true);
        if (playerCount > 1) {
            const seat = gameState.thisPlayer.seat;
            if (seat === undefined) {
                console.error(`[handleTimerExpire] seat is undefined`);
                return;
            } else
                console.log(`[handleTimerExpire] kill player and go next turn`);
            gameStateDispatch({
                type: "killPlayerAndNextTurn",
                payload: [gameState, gameState.thisPlayer.seat!],
            });
            void timerExpiryApi(roomId).then((result) => {
                if (!result.success) {
                    console.warn(
                        "[handleTimerExpire] server timer expiry failed:",
                        result.reason,
                    );
                }
            });
        } else {
            
        }
    }, [gameStateDispatch, gameState, roomId]);


    const setIsSubmitting = useCallback(
        (isSubmiting: boolean) => {
            console.log(
                `[setIsSubmitting] dispatching clientSetIsSubmitting with:`,
                {
                    gameStateSubmitting: gameState.submitting,
                    isSubmiting,
                    gameStateStatus: gameState.status,
                },
            );
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
    const { sendTypingDraft } = useRoomChannel(roomId, {
        userId,
        isHost,
        onUpdate: applyRemote,
        onRoomClosed,
        onTypingDraft: (payload) => {
            onTypingDraftRef.current(payload);
        },
        onWordDefinition: appendDefinition,
        onPlayerLeft,
        presenceSeat: gameState.thisPlayer?.seat,
    });
    const { remoteDraft, clearRemoteDraft, onTypingDraft } = useTypingDraft(
        roomId,
        {
            userId,
            broadcastEnabled: multiplayer && isMyTurn,
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
        if (gameState.status === "finished") return;
        const word = getInputValue();
        const emptyInput = !word || word.length === 0;

        if (emptyInput) {
            setInputError(true);
        } else if (isWordAlreadyUsed(gameState, word)) {
            setInputError(true, gameStrings.wordAlreadyUsed);
            focusInputBox();
        } else {
            const response = await submitWordApi(roomId, word, countdown.remainingSeconds);
            submitWordCallback(
                gameState,
                gameStateDispatch,
                setInputError,
                response,
                word,
            );
            if (response.success) {
                if (response.definition) {
                    appendDefinition(response.definition);
                }
                resetInput();
            } else {
                focusInputBox();
                console.log(`[submitButton] time -> unpaused`);
            }
        }
    }, [gameState, roomId, appendDefinition, countdown.remainingSeconds]);

    // =========================================================================
    // effects
    // =========================================================================
    useEffect(() => {
        clearRemoteDraft();
    }, [gameState.turn, gameState.matchLetter.block, clearRemoteDraft]);

    useEffect(
        () => {
            const parentChanged =
                initialState.status !== gameState.status ||
                initialState.connectedPlayers !== gameState.connectedPlayers ||
                initialState.turn !== gameState.turn ||
                initialState.matchLetter.block !== gameState.matchLetter.block;

            if (parentChanged) {
                gameStateDispatch({
                    type: "replaceGameState",
                    payload: [initialState],
                });
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            // NOTE: causes infinite loop when correct word is submitted
            // initialState,
            // gameState.status,
            // gameState.connectedPlayers,
            // gameState.turn,
            // gameState.matchLetter.block,
        ],
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
        if (gameState.status === "playing") {
            void (isMyTurn ? countdown.start() : countdown.pause());
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
        if (gameState.status === "playing") {
            countdown.start();
        } else {
            countdown.pause();
        }
    }, [gameState.status]);

	useEffect(()=>{
		if(isStartingGame){
			countdown.reset();
		}
	}, [isStartingGame]);

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
                        timerBar={<TimerBar timer={countdown} />}
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
                        />
                    ) : undefined
                }
            />
        </>
    );
}
