"use client";

import { GameStateDispatch } from "@/shared/GameState";
import { GameStateClient } from "@/shared/types";
import { turnToPlayerIndex } from "@/shared/utils";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs a global 1-second tick during gameplay.
 * Each tick decrements `timeRemaining` for the player whose turn it is.
 * When a player's timer reaches 0, dispatches `timerExpire` and advances
 * the turn via `progressNextTurn`.
 */
const poll = 1/1000;
export function useTimer(
    gameState: GameStateClient,
    gameStateDispatch: GameStateDispatch,
    onTimerExpire: (seat: number) => void,
    isPaused: () => boolean,
) {
    const [timer, setTimer] = useState(gameState.timerDuration);
    const timerRef = useRef(timer);
    const dispatchRef = useRef(gameStateDispatch);
    const onExpireRef = useRef(onTimerExpire);
    const timeRef = useRef(gameState.timerDuration);
    const turnRef = useRef(gameState.turn);
    const connectedRef = useRef(gameState.connectedPlayers);

    const tick = useCallback(() => {
        if (isPaused()) {
            return;
        }
        setTimer((time) => time - poll);
    }, [isPaused]);

    const prevPausedRef = useRef(false);

    useEffect(() => {
        timerRef.current = timer;
    }, [timer]);

    useEffect(() => {
        turnRef.current = gameState.turn;
        connectedRef.current = gameState.connectedPlayers;
    }, [gameState.turn, gameState.connectedPlayers]);

    useEffect(() => {
        // console.log(`[useTimer] effect ran: status=${gameState.status}, isPaused=${isPaused()}`);
        if (gameState.status !== "playing") {
            // console.log(`[useTimer] effect — not playing, skipping`);
            return;
        }
        if (timer === 0) {
            return;
        }
        if (isPaused()) {
            if (!prevPausedRef.current) {
                prevPausedRef.current = true;
                // console.log(`[useTimer] effect — paused, dispatching tickTimer`);
                dispatchRef.current({
                    type: "tickTimer",
                    payload: [gameState],
                });
            }
            return;
        }
        prevPausedRef.current = false;
        // console.log(`[useTimer] effect — starting interval`);
        const id = setInterval(tick, poll);
        return () => {
            // console.log(`[useTimer] effect — cleaning up interval`);
            clearInterval(id);
        };
    }, [isPaused, timer]);
    return { timer };
}
