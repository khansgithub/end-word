import type { GameStateEmit, PlayerWithId } from "@/shared/types";
import type { DictionaryEntry } from "@/shared/types";
import type { RoomListItem } from "@/lib/game/roomTypes";
import type { GameLanguage } from "@/lib/dictionary";

export async function fetchLobbyRooms(): Promise<RoomListItem[]> {
  const res = await fetch("/api/rooms");
  if (!res.ok) throw new Error("Failed to load lobby");
  const data = await res.json();
  return data.rooms as RoomListItem[];
}

export async function createRoomApi(options: {
  roomName: string;
  language: GameLanguage;
  isPrivate: boolean;
}) {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error("Failed to create room");
  return res.json();
}

export async function joinRoomApi(body: {
  roomId?: string;
  inviteCode?: string;
  displayName: string;
}): Promise<
  | { success: true; roomId: string; gameState: GameStateEmit; player: PlayerWithId }
  | { success: false; reason: string }
> {
  const res = await fetch("/api/rooms/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function startRoomApi(roomId: string) {
  const res = await fetch(`/api/rooms/${roomId}/start`, { method: "POST" });
  return res.json();
}

export async function submitWordApi(
  roomId: string,
  word: string
): Promise<
  | { success: true; gameState: GameStateEmit; definition?: DictionaryEntry }
  | { success: false; reason: string; gameState?: GameStateEmit }
> {
  const res = await fetch(`/api/rooms/${roomId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word }),
  });
  return res.json();
}

export async function leaveRoomApi(roomId: string) {
  const res = await fetch(`/api/rooms/${roomId}/leave`, { method: "POST" });
  return res.json();
}
