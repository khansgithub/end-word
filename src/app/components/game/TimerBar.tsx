"use client";
import { Countdown } from "@/app/hooks/useCountdown";
import "./game-v2.css";

export interface TimerBarProps {
	timer: Countdown;
	isSubmitting: boolean;
}

export default function TimerBar({ timer, isSubmitting }: TimerBarProps) {
	const pct =
		timer.duration > 0
			? Math.max(
				0,
				Math.min(
					100,
					(timer.remainingMilliSeconds / 1000 / timer.duration) *
					100,
				),
			)
			: 0;

	// nextjs complains about the 2 css properties being updated. to fix later.
	const animationCss = pct == 100 ? 'none' : `shrink-width ${timer.duration}s linear forwards`;

	return (
		<>
			{/* CSS animation bar - visually smooth from 100%->0%, pauses when timer pauses */}
			<div className="g2-timer-bar" role="timer">
				<p> {timer.remainingSeconds}s </p>
				<div className="g2-timer-bar-track">
					<div
						className={`w-full h-2 ${isSubmitting ? "bg-gray-500" : "bg-blue-500"} origin-left`}
						style={{
							width: "100%",
							transition: "background-color var(--g2-transition)",
							animation: animationCss,
							animationPlayState: `${isSubmitting ? "paused" : "running"}`,
							transformOrigin: "left",
						}}
					/>
				</div>
			</div>
		</>
	);
}
