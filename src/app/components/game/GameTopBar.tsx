"use client";

import { gameStrings } from "@/lib/client/ui/game-strings";
import RoundBadge from "@/app/components/game/RoundBadge";
import GameExit from "@/app/components/game/GameExit";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import "./game-v2.css";

export interface GameTopBarProps {
	turn: number;
	roomName?: string | null;
	onExit?: () => void;
	exitDisabled?: boolean;
}

export default function GameTopBar({ turn, roomName, onExit, exitDisabled = false }: GameTopBarProps) {
	const displayName =
		roomName?.trim() || gameStrings.roomUnnamed;

	return (
		<>
			<div className="g2 flex flex-col gap-2 shrink-0">
				<div className="relative flex justify-center min-w-full">
					<h1
						className="text-center text-base sm:text-lg font-semibold truncate"
						style={{ color: "var(--text-primary)" }}
						title={displayName}
					>
						{displayName}
					</h1>
				</div>
				<div className="flex items-center justify-between gap-3">
					<RoundBadge turn={turn} />
					<GameExit onExit={onExit} disabled={exitDisabled} />
				</div>
			</div>
		</>

	);
}
