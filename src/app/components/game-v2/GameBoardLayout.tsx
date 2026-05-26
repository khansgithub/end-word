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
 * Vertical flow: compact top bar → play focus (fills) → word history (capped) → players strip (optional).
 * Avoids a tall right rail that overflows while the play column stays empty.
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
					<div className="flex min-h-0 flex-col shrink-0">{wordHistory}</div>
				</div>

				{playersBar != null && (
					<div className="shrink-0 pb-safe">{playersBar}</div>
				)}
			</div>
		</div>
	);
}
