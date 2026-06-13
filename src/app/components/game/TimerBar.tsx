"use client";
import { RefObject, useEffect, useState, useRef } from "react";
import "./game-v2.css";

export interface TimerBarProps {
    timeRemaining?: number;
    timerDuration: number;
    // frozen: boolean;
    time: RefObject<number>;
    isPaused: () => boolean;
    timer: number;
}

export default function TimerBar({
    timer,
    timerDuration,
    timeRemaining,
    isPaused,
}: TimerBarProps) {
    // const [pct, setPct] = useState(timer == 0 ? 0 : (100 / (timerDuration)) * timer);
    const barRef = useRef<HTMLDivElement>(null);
    const pct = timer > 0 ? (timer / timerDuration) * 100 : 0;
    // const seconds = Math.ceil(timeRemaining);

    useEffect(() => {
        console.log(`[TimerBar] isPaused: ${isPaused()}`);
        if (!barRef.current) return;
        if (isPaused()) {
            const currentWidth = getComputedStyle(barRef.current).width;
            barRef.current.style.transition = "none";
            barRef.current.style.width = currentWidth;
        } else {
            barRef.current.style.transition = "width 1s linear";
            barRef.current.style.width = Math.min(
                parseFloat(barRef.current.style.width),
                timer > 0 ? (timer / timerDuration) * 100 : 0
            ).toString() + "%";
        }
    }, [isPaused]);

    console.log(
        `[TimerBar] render: timerDuration=${timerDuration}, timer=${timer}, pct=${pct}%`,
    );
    return (
        <div className="g2-timer-bar" role="timer">
            <p> {timer}s </p>
            <div className="g2-timer-bar-track">
                <div
                    ref={barRef}
                    className="w-full h-2 bg-blue-500 origin-right"
                    style={{
                        transition: `width 1s linear`,
                        width: `${Math.max(pct - 0.005, 0)}%`,
                        // animation: `shrink-width ${duration}s linear forwards ${frozen ? "paused" : "running"}`,
                        transformOrigin: "left", // just in case
                    }}
                />
                {/*<div
					className={`g2-timer-bar-fill ${frozen ? "g2-timer-bar-fill-frozen" : ""}`}
					style={{ width: `${pct}%` }}
				/>*/}
            </div>
            {/*<span className={`g2-timer-bar-label ${frozen ? "g2-timer-bar-label-frozen" : ""}`}>
				{seconds}s
			</span>*/}
        </div>
    );
}
