"use client";

import type { MatchLetter } from "@/shared/types";
import GameTopBar from "@/app/components/game-v2/GameTopBar";
import PlayStatusGrid from "@/app/components/game-v2/PlayStatusGrid";
import "./game-v2.css";

export interface PlayHeaderProps {
  matchLetter: MatchLetter;
  turn: number;
  yourHealth: number;
  yourName?: string;
  roomName?: string | null;
  onExit?: () => void;
}

/** @deprecated Prefer GameTopBar + PlayStatusGrid in GameBoardLayout. */
export default function PlayHeader({
  matchLetter,
  turn,
  yourHealth,
  yourName,
  roomName,
  onExit,
}: PlayHeaderProps) {
  return (
    <header className="g2 flex flex-col gap-3 w-full">
      <GameTopBar turn={turn} roomName={roomName} onExit={onExit} />
      <PlayStatusGrid
        matchLetter={matchLetter}
        yourHealth={yourHealth}
        yourName={yourName}
      />
    </header>
  );
}
