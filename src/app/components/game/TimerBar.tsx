"use client";
import { Countdown } from "@/app/hooks/useCountdown";
import "./game-v2.css";

export interface TimerBarProps {
    timer: Countdown;
}

export default function TimerBar({ timer }: TimerBarProps) {
    // JS "width-transition" bar
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

    function getPercentage(remaingingMs: number) {
        if (remaingingMs <= 0) return 0;
        return Math.max(
            0,
            Math.min(100, (remaingingMs / 1000 / timer.duration) * 100),
        );
    }
    // console.log(timer.remainingSeconds);

    return (
        <>
            {/* CSS animation bar - visually smooth from 100%->0%, pauses when timer pauses */}
            <div className="g2-timer-bar" role="timer">
                <p> {timer.remainingSeconds}s </p>
                <div className="g2-timer-bar-track">
                    <div
                        className={`w-full h-2 ${timer.isPaused ? "bg-gray-500" : "bg-blue-500"} origin-left`}
                        style={{
                            width: "100%",
                            transition: "background-color var(--g2-transition)",
                            animation: `shrink-width ${timer.duration}s linear forwards`,
                            animationPlayState: `${timer.isPaused ? "paused" : "running"}`,
                            transformOrigin: "left",
                        }}
                    />
                </div>
            </div>
        </>
    );
}
