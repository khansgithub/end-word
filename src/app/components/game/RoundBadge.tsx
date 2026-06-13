"use client";

import { gameStrings } from "@/lib/client/ui/game-strings";
import "./game-v2.css";

export interface RoundBadgeProps {
  turn: number;
}

/**
 * Current round number.
 * WIRE: pass `gameState.turn ?? 1`.
 */
export default function RoundBadge({ turn }: RoundBadgeProps) {
  return (
    <div
      className="g2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums"
      style={{
        borderColor: "var(--g2-border)",
        background: "var(--g2-surface-raised)",
        color: "var(--text-primary)",
      }}
    >
      <span className="g2-label mb-0">{gameStrings.round.trim()}</span>
      <span className="font-semibold">{turn ?? 1}</span>
    </div>
  );
}
