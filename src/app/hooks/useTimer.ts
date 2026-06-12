"use client";

import { GameStateDispatch } from "@/shared/GameState";
import { GameStateClient } from "@/shared/types";
import { useCallback, useEffect, useRef } from "react";

/**
 * Runs a global 1-second tick during gameplay.
 * Each tick decrements `timeRemaining` for the player whose turn it is.
 * When a player's timer reaches 0, dispatches `timerExpire` and advances
 * the turn via `progressNextTurn`.
 */
export function useTimer(
	gameState: GameStateClient,
	gameStateDispatch: GameStateDispatch,
	onTimerExpire: (seat: number) => void,
	isPaused: () => boolean,
) {
	const dispatchRef = useRef(gameStateDispatch);
	const onExpireRef = useRef(onTimerExpire);
    const timeRef = useRef(gameState.timerDuration);
    
	const tick = useCallback(() => {
		if (isPaused()) {
			// console.log(`[useTimer] tick skipped — paused`);
			return;
		}
		const timerValue = timeRef.current;
		if (timerValue <= 0) {
			// console.log(`[useTimer] timer expired`);
			onExpireRef.current(0);
			return;
		};
		timeRef.current -= 1;
		// console.log(`[useTimer] time set to: ${timeRef.current}`);
	}, [isPaused]);

	const prevPausedRef = useRef(false);

	useEffect(() => {
		// console.log(`[useTimer] effect ran: status=${gameState.status}, isPaused=${isPaused()}`);
		if (gameState.status !== "playing") {
			// console.log(`[useTimer] effect — not playing, skipping`);
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
		const id = setInterval(tick, 1000);
		return () => {
			// console.log(`[useTimer] effect — cleaning up interval`);
			clearInterval(id);
		};
	}, [isPaused]);
}
