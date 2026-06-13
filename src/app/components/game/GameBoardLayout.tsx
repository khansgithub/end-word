"use client";

import type { ReactNode } from "react";
import "./game-v2.css";

export interface GameBoardLayoutProps {
	topBar: ReactNode;
	playFocus: ReactNode;
	wordHistory: ReactNode;
	/** Omitted when solo — your status is already in the play grid. */
	playersBar?: ReactNode;
}

/**
 * Vertical flow: top bar → play focus → definitions → players (md+).
 * Below md, players strip sits above definitions so roster stays near the input.
 */
export default function GameBoardLayout({
	topBar,
	playFocus,
	wordHistory,
	playersBar,
}: GameBoardLayoutProps) {
	return (
		<div
			className="g2 flex flex-col w-full min-h-dvh"
			style={{ backgroundColor: "var(--b-bg)", fontFamily: "var(--font-b-sans)" }}
		>
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 p-4 md:gap-4 md:p-5 min-h-0">
				{topBar}

				<div className="flex flex-col gap-3 min-h-0">
					<div className="shrink-0">{playFocus}</div>
					{playersBar != null && (
						<div className="order-2 shrink-0 pb-safe md:order-3">{playersBar}</div>
					)}
					<div className="order-3 flex min-h-0 shrink-0 flex-col md:order-2">
						{wordHistory}
					</div>
				</div>
			</div>
		</div>
	);
}
