import { useStopwatch } from "react-timer-hook";
import { RefObject, useEffect, useRef, useState } from "react"; // BUG 7: unused import useRef
import { GameStatus } from "@/shared/types";

export type Countdown = {
	remainingSeconds: number;
	remainingMilliSeconds: number;
	pasuedRemainingSeconds: RefObject<number>;
	pasuedRemainingMilliSeconds: RefObject<number>;
	duration: number;
	isPaused: boolean;
	start: () => void;
	pause: () => void;
	reset: () => void;
};

export function useCountdown(
	duration: number,
	gameStatus: GameStatus,
	isPaused: boolean,
): Countdown {
	const durationMs = duration * 1000;
	const sw = useStopwatch({
		autoStart: false,
	});

	const pasuedRemainingSeconds = useRef(0);
	const pasuedRemainingMilliSeconds = useRef(0);

	const remainingMilliSeconds = Math.max(
		0,
		durationMs - sw.totalMilliseconds,
	);
	const remainingSeconds = Math.max(0, duration - sw.totalSeconds);

	function reset() {
		sw.reset(undefined, false);
	}

	function pause() {
		sw.pause();
		pasuedRemainingSeconds.current = remainingSeconds;
		pasuedRemainingMilliSeconds.current = remainingMilliSeconds;
	}

	useEffect(() => {
		console.log(
			"[useCountdown][isPaused effect] isPaused changed:",
			isPaused,
		);
		if (isPaused) {
			console.log(
				`[useCountdown][isPaused effect] Pausing stopwatch at ${remainingSeconds}/${remainingMilliSeconds}.`,
			);
			pause();
		} else {
			console.log(
				"[useCountdown][isPaused effect] Starting stopwatch (unpaused).",
			);
			sw.start();
		}
	}, [isPaused]);

	useEffect(() => {
		console.log(`[useCountdown] remainingSeconds=${remainingSeconds}`)
	}, [remainingSeconds])

	function foo (){
		return remainingSeconds;
	}

	return {
		remainingSeconds,
		remainingMilliSeconds,
		pasuedRemainingSeconds,
		pasuedRemainingMilliSeconds,
		duration: duration,
		isPaused: !sw.isRunning,
		start: sw.start,
		pause: pause,
		reset,
	};
}
