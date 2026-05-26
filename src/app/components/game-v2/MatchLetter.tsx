"use client";

import type { MatchLetter as MatchLetterType } from "@/shared/types";
import { gameStrings } from "@/lib/client/ui/game-strings";
import "./game-v2.css";

export interface MatchLetterProps {
  matchLetter: MatchLetterType;
  /** Fill grid cell in PlayStatusGrid (equal height with YourStatusTile). */
  fill?: boolean;
}

/**
 * Displays the syllable/block the next word must start with.
 * WIRE: pass `gameState.matchLetter` from parent.
 */
export default function MatchLetter({ matchLetter, fill = false }: MatchLetterProps) {
  return (
    <section
      className={`g2 g2-panel flex flex-col items-center justify-center gap-2 px-4 py-4 ${
        fill ? "g2-status-tile h-full min-h-0" : "min-w-[7.5rem]"
      }`}
      aria-label={gameStrings.matchLetter}
    >
      <span className="g2-label">{gameStrings.matchLetter}</span>
      <span
        className={`font-mono font-semibold tracking-tight leading-none tabular-nums ${
          fill ? "text-5xl sm:text-6xl" : "text-6xl md:text-7xl"
        }`}
        style={{ color: "var(--g2-accent)" }}
      >
        {matchLetter.block}
      </span>
      {/* WIRE: optional hint — matchLetter.steps for composition UI */}
    </section>
  );
}
