"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerHealth } from "@/app/components/PlayerHealth";
import "./game-v2.css";

export interface YourStatusTileProps {
  health: number;
  playerName?: string;
  label?: string;
}

/** Mirrors MatchLetter tile height and visual weight in the status grid. */
export default function YourStatusTile({
  health,
  playerName,
  label = "You",
}: YourStatusTileProps) {
  const prevHealthRef = useRef(health);
  const [isDamaged, setIsDamaged] = useState(false);
  const initial = playerName?.[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    if (health < prevHealthRef.current) {
      setIsDamaged(true);
      const timer = window.setTimeout(() => setIsDamaged(false), 450);
      prevHealthRef.current = health;
      return () => window.clearTimeout(timer);
    }
    prevHealthRef.current = health;
  }, [health]);

  return (
    <div
      className={`g2 g2-panel g2-status-tile flex flex-col items-center justify-center gap-2 px-4 py-4 h-full min-h-0 ${isDamaged ? "g2-damage" : ""}`}
      aria-live="polite"
    >
      <span className="g2-label">{label}</span>
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold"
        style={{
          background: "var(--g2-accent-muted)",
          color: "var(--text-primary)",
          border: "1px solid var(--g2-accent)",
        }}
        aria-hidden
      >
        {initial}
      </div>
      {playerName && (
        <p
          className="text-sm font-semibold truncate max-w-full text-center"
          style={{ color: "var(--text-primary)" }}
        >
          {playerName}
        </p>
      )}
      <div className="w-full max-w-[8rem] mt-auto pt-1">
        <PlayerHealth health={health} />
      </div>
    </div>
  );
}
