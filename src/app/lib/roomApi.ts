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

type SubmitWordApiResult =
    | { success: true; gameState: GameStateEmit; definition?: DictionaryEntry }
    | { success: false; reason: string; gameState?: GameStateEmit };

function parseSubmitWordResponse(
    res: Response,
    data: Record<string, unknown>
): SubmitWordApiResult {
    if (data.success === true && data.gameState) {
        return {
            success: true,
            gameState: data.gameState as GameStateEmit,
            definition: data.definition as DictionaryEntry | undefined,
        };
    }

    const reason =
        (typeof data.reason === "string" && data.reason) ||
        (typeof data.error === "string" && data.error) ||
        (res.status === 401
            ? "Unauthorized"
            : res.status === 404
                ? "Room not found"
                : "Submit failed");

    return {
        success: false,
        reason,
        ...(data.gameState ? { gameState: data.gameState as GameStateEmit } : {}),
    };
}

export async function submitWordApi(
    roomId: string,
    word: string
): Promise<SubmitWordApiResult> {
    const res = await fetch(`/api/rooms/${roomId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return parseSubmitWordResponse(res, data);
}

export async function leaveRoomApi(roomId: string) {
    const res = await fetch(`/api/rooms/${roomId}/leave`, {
        method: "POST",
        keepalive: true,
    });
    return res.json() as Promise<{ dissolved: boolean; gameState: GameStateEmit | null }>;
}

export async function dissolveRoomApi(roomId: string) {
    const res = await fetch(`/api/rooms/${roomId}/dissolve`, {
        method: "POST",
        keepalive: true,
    });
    return res.json() as Promise<{ dissolved: boolean }>;
}
