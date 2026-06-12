"use client";
import { RefObject } from "react";
import "./game-v2.css";

export interface TimerBarProps {
	// timeRemaining: number;
	timerDuration: number;
	// frozen: boolean;
	time: RefObject<number>;
	isPaused: () => boolean;
}

export default function TimerBar({ timerDuration, isPaused }: TimerBarProps) {
	// const pct = timerDuration > 0 ? (timeRemaining / timerDuration) * 100 : 0;
	// const seconds = Math.ceil(timeRemaining);

	const frozen = isPaused();
	console.log(`[TimerBar] render: frozen=${frozen}, timerDuration=${timerDuration}`);
	return (
		<div className="g2-timer-bar" role="timer">
            <div className="g2-timer-bar-track">
                <div className="w-full h-2 bg-blue-500 origin-right"
                     style={{
                         animation: `shrink-width ${timerDuration}s linear forwards`,
                         animationPlayState: frozen ? "paused" : "running",
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
