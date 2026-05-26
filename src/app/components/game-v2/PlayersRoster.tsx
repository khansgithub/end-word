"use client";

import type { GameStateClient } from "@/shared/types";
import { isActivePlayer, isPlayerTurn } from "@/shared/utils";
import { gameStrings } from "@/lib/client/ui/game-strings";
import PlayerCard, { EmptySeatCard } from "@/app/components/game-v2/PlayerCard";
import "./game-v2.css";

export interface PlayersRosterProps {
  gameState: GameStateClient;
  hideEmptySeats?: boolean;
  /** Partial word from the player whose turn it is (spectators only). */
  turnTypingText?: string;
}

/**
 * Horizontal player strip — shown when 2+ players in room.
 * Solo: hidden at layout level; your status lives in PlayStatusGrid.
 */
export default function PlayersRoster({
  gameState,
  hideEmptySeats = true,
  turnTypingText,
}: PlayersRosterProps) {
  const { players, turn, connectedPlayers, thisPlayer } = gameState;
  const activeCount = players.filter((p) => isActivePlayer(p)).length;
  const leftCount = players.filter((p) => p != null && p.left).length;

  return (
    <section className="g2 g2-panel px-3 py-2.5">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--g2-muted)" }}>
          {gameStrings.players}
        </h2>
        <span className="text-xs tabular-nums" style={{ color: "var(--g2-muted)" }}>
          {activeCount} playing
          {leftCount > 0 ? ` · ${leftCount} left` : ""}
        </span>
      </div>

      <div
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 -mx-0.5 px-0.5"
        id="players"
      >
        {players.map((p, i) => {
          if (p === null) {
            if (hideEmptySeats) return null;
            return <EmptySeatCard key={i} seatIndex={i} compact />;
          }

          const onTurn = isActivePlayer(p) && isPlayerTurn({ turn, connectedPlayers }, i);

          return (
            <PlayerCard
              key={"uid" in p && p.uid ? p.uid : `${p.name}-${i}`}
              player={p}
              turn={onTurn}
              lastWord={p.lastWord}
              typingDraft={onTurn ? turnTypingText : undefined}
              isCurrentPlayer={thisPlayer?.seat === i}
              compact
            />
          );
        })}
      </div>
    </section>
  );
}

/** Hide roster when only one active player remains (solo). */
export function shouldShowPlayersBar(gameState: GameStateClient): boolean {
  return gameState.players.filter((p) => isActivePlayer(p)).length > 1;
}
