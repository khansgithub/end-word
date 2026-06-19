import type { GameLanguage, Spectator } from "@/shared/types";
import type { GameStatus, MatchLetter, ServerPlayers } from "@/shared/types";

export type RoomRow = {
  roomid: string;
  roomname: string | null;
  playercount: number;
  invite_code: string;
  is_private: boolean;
  language: GameLanguage;
  host_user_id: string | null;
  status: GameStatus;
  match_letter: MatchLetter | null;
  turn: number;
  players: ServerPlayers;
  player_user_map: Record<string, number>;
  connected_players: number;
  used_words: string[];
  spectators: Spectator[];
  archived_at: string | null;
  created_at?: string;
  updated_at?: string;
  timer_duration?: number;
};

export type RoomListItem = {
  roomid: string;
  roomname: string | null;
  invite_code: string;
  is_private: boolean;
  language: GameLanguage;
  status: GameStatus;
  connected_players: number;
  host_user_id: string | null;
};
