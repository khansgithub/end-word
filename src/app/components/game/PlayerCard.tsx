"use client";

import type { Player as PlayerType } from "@/shared/types";
import { PlayerHealth } from "@/app/components/game/PlayerHealth";
import { gameStrings } from "@/lib/client/ui/game-strings";
import "./game-v2.css";

export interface PlayerCardProps {
	player: PlayerType;
	turn: boolean;
	lastWord?: string;
	/** Live partial word from this player (replaces lastWord line; no layout shift). */
	typingDraft?: string;
	isCurrentPlayer?: boolean;
	/** Horizontal strip in PlayersRoster. */
	compact?: boolean;
	/** Remaining time in seconds (for timer display). */
	timeRemaining?: number;
	timerDuration?: number;
}

/**
 * Single opponent / seat card.
 * WIRE: from PlayersRoster — `turn={isPlayerTurn(...)}`, `lastWord={p.lastWord}`, `isCurrentPlayer={thisPlayer?.seat === i}`.
 */
export default function PlayerCard({
	player,
	turn,
	lastWord,
	typingDraft,
	isCurrentPlayer = false,
	compact = false,
	timeRemaining,
	timerDuration,
}: PlayerCardProps) {
	const initial = player.name[0]?.toUpperCase() ?? "?";
	const hasLeft = Boolean(player.left);
	const isTyping = Boolean(typingDraft) && !hasLeft;
	const sublineTitle = hasLeft
		? gameStrings.playerLeft
		: isTyping
			? typingDraft
			: lastWord;

	if (compact) {
		return (
			<article
				className={`g2 flex flex-col shrink-0 rounded-[var(--g2-radius)] border min-w-[10.5rem] max-w-[14rem] transition-[box-shadow,border-color] ${turn ? "g2-turn-active" : ""} ${isTyping ? "g2-player-card--typing" : ""} ${hasLeft ? "g2-player-card--left" : ""}`}
				style={{
					borderColor: turn ? "var(--g2-accent)" : "var(--g2-border)",
					background: "var(--g2-surface-raised)",
				}}
				aria-current={turn ? "true" : undefined}
			>
				<div className="flex items-center gap-2.5 px-3 py-2">
					<div
						className={`g2-player-avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isTyping ? "g2-player-avatar--typing" : ""}`}
						style={{
							background: turn ? "var(--g2-accent-muted)" : "var(--g2-surface)",
							border: `1px solid ${turn ? "var(--g2-accent)" : "var(--g2-border)"}`,
							color: "var(--text-primary)",
						}}
					>
						{initial}
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-xs font-semibold truncate" style={{ color: hasLeft ? "var(--g2-muted)" : "var(--text-primary)" }}>
							{player.name}
							{isCurrentPlayer && !hasLeft && (
								<span className="font-normal" style={{ color: "var(--g2-muted)" }}>
									{" "}
									· you
								</span>
							)}
						</p>
						<p
							className="g2-player-subline text-[0.65rem] truncate min-h-[1.05rem] leading-4"
							style={{ color: hasLeft ? "var(--g2-danger)" : isTyping ? "var(--g2-accent)" : "var(--g2-muted)" }}
							title={sublineTitle}
							aria-live={isTyping ? "polite" : undefined}
							aria-atomic={isTyping ? "true" : undefined}
							data-testid={isTyping ? "remote-typing-preview" : undefined}
						>
							{isTyping ? (
								<span className="g2-player-typing font-mono">
									{typingDraft}
									<span className="g2-player-typing-caret" aria-hidden="true" />
								</span>
							) : hasLeft ? (
								gameStrings.playerLeft
							) : (
								lastWord || "—"
							)}
						</p>
					</div>
					{!hasLeft && (
						<div className="w-14 shrink-0">
							<PlayerHealth health={player.health} />
						</div>
					)}
				</div>
				{!hasLeft && timeRemaining !== undefined && timerDuration !== undefined && timerDuration > 0 && (
					<div className="flex items-center gap-2 px-3 pb-1.5">
						<div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--g2-surface)" }}>
							<div className="h-full" style={{ width: `${Math.max(0, (timeRemaining / timerDuration) * 100)}%` }}>
								<div
									className="h-full rounded-full"
									style={{
										width: "100%",
										background: turn ? "linear-gradient(90deg, #06b6d4, #22d3ee)" : "var(--g2-muted)",
										...(turn
											? { animation: `shrink-width ${timeRemaining}s linear forwards` }
											: {}),
									}}
								/>
							</div>
						</div>
					</div>
				)}
			</article>
		);
	}

	return (
		<article
			className={`g2 g2-panel flex flex-col gap-2 p-3 min-w-[7.5rem] max-w-[9.5rem] transition-[box-shadow,transform] ${turn ? "g2-turn-active" : ""} ${hasLeft ? "g2-player-card--left" : ""}`}
			style={{
				transform: isCurrentPlayer ? "scale(1.02)" : undefined,
				borderColor: turn ? "var(--g2-accent)" : "var(--g2-border)",
			}}
			aria-current={turn ? "true" : undefined}
		>
			<div className="flex items-center gap-2 min-w-0">
				<div
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
					style={{
						background: turn ? "var(--g2-accent-muted)" : "var(--g2-surface-raised)",
						color: "var(--text-primary)",
						border: `1px solid ${turn ? "var(--g2-accent)" : "var(--g2-border)"}`,
					}}
				>
					{initial}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
						{player.name}
						{isCurrentPlayer && (
							<span className="ml-1 text-xs font-normal" style={{ color: "var(--g2-muted)" }}>
								(you)
							</span>
						)}
					</p>
					{turn && (
						<span
							className="inline-flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide"
							style={{ color: "var(--g2-success)" }}
						>
							<span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--g2-success)" }} />
							Turn
						</span>
					)}
				</div>
			</div>

			{lastWord ? (
				<p className="text-xs truncate" style={{ color: "var(--g2-muted)" }} title={lastWord}>
					{lastWord}
				</p>
			) : (
				<p className="text-xs italic" style={{ color: "var(--g2-muted)" }}>
					—
				</p>
			)}

			<PlayerHealth health={player.health} />
		</article>
	);
}

export interface EmptySeatCardProps {
	seatIndex: number;
	compact?: boolean;
}

/** WIRE: only when `showEmptySeats` — solo mode hides these. */
export function EmptySeatCard({ seatIndex, compact = false }: EmptySeatCardProps) {
	if (compact) {
		return (
			<article
				className="g2 flex shrink-0 items-center justify-center rounded-[var(--g2-radius)] border border-dashed px-4 py-2 min-w-[5rem] opacity-40 text-xs"
				style={{ borderColor: "var(--g2-border)", color: "var(--g2-muted)" }}
				aria-label={`Empty seat ${seatIndex + 1}`}
			>
				{gameStrings.emptySeat}
			</article>
		);
	}

	return (
		<article
			className="g2 flex flex-col items-center justify-center gap-1 rounded-[var(--g2-radius-lg)] border border-dashed p-3 min-w-[7.5rem] max-w-[9.5rem] opacity-40"
			style={{ borderColor: "var(--g2-border)" }}
			aria-label={`Empty seat ${seatIndex + 1}`}
		>
			<span className="text-lg font-mono" style={{ color: "var(--g2-muted)" }}>
				{gameStrings.emptySeat}
			</span>
			<span className="text-xs" style={{ color: "var(--g2-muted)" }}>
				{gameStrings.empty}
			</span>
		</article>
	);
}