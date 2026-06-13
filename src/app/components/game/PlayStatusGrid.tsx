"use client";

import type { MatchLetter as MatchLetterType } from "@/shared/types";
import MatchLetter from "@/app/components/game/MatchLetter";
import YourStatusTile from "@/app/components/game/YourStatusTile";
import "./game-v2.css";

export interface PlayStatusGridProps {
  matchLetter: MatchLetterType;
  yourHealth: number;
  yourName?: string;
}

/**
 * Equal-weight tiles: letter to match + your status.
 * Same min-height so solo play does not leave empty vertical space beside the letter.
 */
export default function PlayStatusGrid({
  matchLetter,
  yourHealth,
  yourName,
}: PlayStatusGridProps) {
  return (
    <div className="g2-status-grid grid grid-cols-2 gap-3 w-full">
      <MatchLetter matchLetter={matchLetter} fill />
      <YourStatusTile health={yourHealth} playerName={yourName} />
    </div>
  );
}
