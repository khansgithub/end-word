"use client";

import type { ReactNode } from "react";
import "./game-v2.css";

export interface PlayFocusPanelProps {
	status: ReactNode;
	input: ReactNode;
	disabled: boolean;
	timerBar?: ReactNode;
}

/** Primary play column: status grid + word input in one surface. */
export default function PlayFocusPanel({ status, input, disabled, timerBar }: PlayFocusPanelProps) {
	return (
		<section
			className={`g2 g2-panel g2-play-focus-panel flex flex-col gap-4 p-4 md:p-5 min-h-0 ${!disabled ? "g2-play-focus-active" : ""}`}
		>
			{timerBar && <div className="shrink-0">{timerBar}</div>}
			{status}
			{input}
		</section>
	);
}
