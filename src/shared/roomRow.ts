import { DEFAULT_TIMER_DURATION } from "@/shared/consts";
import type { GameStateServer, ServerPlayers } from "@/shared/types";
import { buildMatchLetterForLanguage, getAlivePlayerCount } from "@/shared/utils";
import type { RoomRow } from "@/shared/roomTypes";

function normalizePlayersArray(players: ServerPlayers): ServerPlayers {
  const base = Array(4).fill(null) as ServerPlayers;
  players.forEach((p, i) => {
    if (i < 4) base[i] = p;
  });
  return base;
}

export function rowToGameState(row: RoomRow): GameStateServer {
  const map = new Map<string, number>(
    Object.entries(row.player_user_map ?? {}).map(([k, v]) => [k, Number(v)])
  );
  const players = normalizePlayersArray(row.players);
  const matchLetter =
    row.match_letter ??
    buildMatchLetterForLanguage(row.language === "en" ? "a" : "다", row.language);

  return {
    matchLetter,
    status: row.status,
    players,
    connectedPlayers: row.connected_players,
    turn: row.turn,
    timerDuration: row.timer_duration ?? DEFAULT_TIMER_DURATION,
    usedWords: Array.isArray(row.used_words) ? row.used_words : [],
    socketPlayerMap: map,
    language: row.language,
  };
}

/** True when the room was archived after a normal match (one survivor). */
export function isCompletedGameRow(row: RoomRow): boolean {
  if (row.status !== "finished" || !row.archived_at) return false;
  return getAlivePlayerCount(rowToGameState(row)) === 1;
}
