import { useStopwatch } from "react-timer-hook";
import { useEffect } from "react";
import { GameStatus } from "@/shared/types";
import { logger } from "@/lib/client/logging";

const L = "useCountdown";

export type Countdown = {
	remainingSeconds: number;
	remainingMilliSeconds: number;
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

	const remainingMilliSeconds = Math.max(
		0,
		durationMs - sw.totalMilliseconds,
	);
	const remainingSeconds = Math.max(0, duration - sw.totalSeconds);

	function reset() {
		logger.debug(L, "reset");
		sw.reset(undefined, false);
	}

	useEffect(() => {
		logger.debug(L, "isPaused effect", { isPaused, isRunning: sw.isRunning, remaining: remainingSeconds, totalMs: sw.totalMilliseconds });
		if (isPaused) {
			logger.debug(L, "Pausing stopwatch", { remaining: remainingSeconds, remainingMs: remainingMilliSeconds });
			sw.pause();
		} else {
			logger.debug(L, "Starting stopwatch (unpaused)", { remaining: remainingSeconds });
			sw.start();
		}
	}, [isPaused]);

	return {
		remainingSeconds,
		remainingMilliSeconds,
		duration: duration,
		isPaused: !sw.isRunning,
		start: sw.start,
		pause: sw.pause,
		reset,
	};
}
