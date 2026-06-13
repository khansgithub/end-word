"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerHealth } from "@/app/components/game/PlayerHealth";
import "./game-v2.css";

export interface HealthStripProps {
  health: number;
  /** WIRE: `gameState.thisPlayer.name` */
  playerName?: string;
  label?: string;
}

/**
 * Current player's health — shown in the play header.
 * WIRE: `health={gameState.thisPlayer.health}`.
 * WIRE: damage animation — copy effect from `@/app/components/HealthDisplay` if needed.
 */
export default function HealthStrip({
  health,
  playerName,
  label = "You",
}: HealthStripProps) {
  const prevHealthRef = useRef(health);
  const [isDamaged, setIsDamaged] = useState(false);

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
      className={`g2 g2-panel flex items-center gap-3 px-4 py-2.5 ${isDamaged ? "g2-damage" : ""}`}
      aria-live="polite"
    >
      <div className="flex flex-col min-w-0">
        <span className="g2-label">{label}</span>
        {playerName && (
          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {playerName}
          </span>
        )}
      </div>
      <div className="ml-auto min-w-[4.5rem]">
        <PlayerHealth health={health} />
      </div>
    </div>
  );
}
