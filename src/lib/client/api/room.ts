import type { GameLanguage, GameStateEmit, PlayerWithId, SubmitResult } from "@/shared/types";
import type { DictionaryEntry } from "@/shared/types";
import type { RoomListItem } from "@/shared/roomTypes";


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
	timerDuration?: number;
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
	| { success: true; gameState: GameStateEmit; definition: DictionaryEntry }
	| { success: false; reason: string; gameState?: GameStateEmit };

function parseSubmitWordResponse(
	res: Response,
	data: SubmitResult
): SubmitWordApiResult {

	return data.success ? ({
		success: true,
		gameState: data.gameState as GameStateEmit,
		definition: data.definition as DictionaryEntry,
	}) : ({
		success: false,
		reason: data.reason,
		...(data.gameState ? { gameState: data.gameState as GameStateEmit } : {}),
	});

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

	if (res.status !== 200) {
		return {
			success: false,
			reason: "Submit failed",
		};
	}

	let data: SubmitResult;
	try {
		const text = await res.clone().text();
		// console.log("[submitWordApi] text", text);
		data = JSON.parse(text) as SubmitResult;
		// data = await res.json();
	} catch (error) {
		console.error("[submitWordApi] Failed to parse JSON response:", error);
		data = { success: false, reason: "Invalid server response" } as SubmitResult;
	}
	// console.log("[submitWordApi] data", JSON.stringify(data, null, 2));
	const parsed = parseSubmitWordResponse(res, data);

	return parsed;
}

export type TimerExpiryApiResult =
	| { success: true; gameState: GameStateEmit }
	| { success: false; reason: string };

export async function timerExpiryApi(roomId: string): Promise<TimerExpiryApiResult> {
	const res = await fetch(`/api/rooms/${roomId}/timer-expiry`, {
		method: "POST",
	});
	if (res.status !== 200) {
		return { success: false, reason: "Timer expiry request failed" };
	}
	return res.json();
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
