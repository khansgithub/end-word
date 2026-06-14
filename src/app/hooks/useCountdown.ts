import { useStopwatch } from "react-timer-hook";
import { useEffect, useState } from "react"; // BUG 7: unused import useRef
import { GameStatus } from "@/shared/types";

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

    // const [countdownSeconds, setCountdownSeconds] = useState(duration);
    // const [countdownMilliseconds, setCountdownMilliseconds] = useState(durationMs);
    const countdownMilliseconds = Math.max(
        0,
        durationMs - sw.totalMilliseconds,
    );
    const countdownSeconds = Math.max(0, duration - sw.totalSeconds);
    
    function reset() {
        sw.reset(undefined, false);
    }

    // useEffect(() => {
    // 	const ms = durationMs - sw.totalMilliseconds;
    // 	const s = duration - sw.totalSeconds;
    // 	console.log(
    // 		`[useCountdown]ms: ${ms} | s: ${s} | countdownMilliseconds: ${countdownMilliseconds} | countdownSeconds: ${countdownSeconds}`
    // 	);
    // 	if (ms <= 0 || s <= 0) {
    // 		console.log("[useCountdown][sw.milliseconds effect] Timer ended. Resetting.");
    // 		// reset();
    // 		return;
    // 	}
    // 	setCountdownSeconds(s);
    // 	setCountdownMilliseconds(ms);
    // }, [sw.totalMilliseconds]);

    // useEffect(() => {
    //     console.log(
    //         "[useCountdown][gameStatus effect] gameStatus changed:",
    //         gameStatus,
    //     );
    //     if (gameStatus === "playing") {
    //         console.log(
    //             "[useCountdown][gameStatus effect] Starting stopwatch.",
    //         );
    //         sw.start();
    //     } else {
    //         console.log(
    //             "[useCountdown][gameStatus effect] Resetting countdown (not playing).",
    //         );
    //         // reset(); // NOTE: intentionally commented out — countdown frozen on finish
    //     }
    // }, [gameStatus]);

    useEffect(() => {
        console.log(
            "[useCountdown][isPaused effect] isPaused changed:",
            isPaused,
        );
        if (isPaused) {
            console.log(
                `[useCountdown][isPaused effect] Pausing stopwatch at ${countdownSeconds}/${countdownMilliseconds}.`,
            );
            sw.pause();
        } else {
            console.log(
                "[useCountdown][isPaused effect] Starting stopwatch (unpaused).",
            );
            sw.start();
        }
    }, [isPaused]);

    return {
        remainingSeconds: countdownSeconds,
        remainingMilliSeconds: countdownMilliseconds,
        duration: duration,
        isPaused: !sw.isRunning,
        start: sw.start,
        pause: sw.pause,
        reset,
    };
}
