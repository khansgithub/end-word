import { useStopwatch } from "react-timer-hook";
import { useEffect } from "react";
import { GameStatus } from "@/shared/types";
import { ConsoleTransport, LogLayer } from 'loglayer';

const L = "useCountdown";
const logger = new LogLayer({
	transport: new ConsoleTransport({
		logger: console,
		enabled: process.env.NODE_ENV !== "production",
		appendObjectData: true
	})
}).withPrefix(L)

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
		// logger.debug(L, "reset");
		sw.reset(undefined, false);
	}

	useEffect(() => {
		logger.withMetadata({ isPaused, isRunning: sw.isRunning, remaining: remainingSeconds, totalMs: sw.totalMilliseconds }).debug("isPaused effect");
		if (isPaused) {
			// logger.debug(L, "Pausing stopwatch", { remaining: remainingSeconds, remainingMs: remainingMilliSeconds });
			sw.pause();
		} else {
			// logger.debug(L, "Starting stopwatch (unpaused)", { remaining: remainingSeconds });
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
