import type { GameLanguage, GameStateEmit, PlayerWithId, SubmitResult } from "@/shared/types";
import type { DictionaryEntry } from "@/shared/types";
import type { RoomListItem } from "@/shared/roomTypes";
import { logger } from "@/lib/client/logging";

const L = "RoomAPI";

export async function fetchLobbyRooms(): Promise<RoomListItem[]> {
	logger.debug(L, "fetchLobbyRooms");
	const res = await fetch("/api/rooms");
	if (!res.ok) throw new Error("Failed to load lobby");
	const data = await res.json();
	logger.info(L, "fetchLobbyRooms success", { count: data.rooms?.length });
	return data.rooms as RoomListItem[];
}

export async function createRoomApi(options: {
	roomName: string;
	language: GameLanguage;
	isPrivate: boolean;
	timerDuration?: number;
}) {
	logger.info(L, "createRoomApi", options);
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
	logger.info(L, "joinRoomApi", { roomId: body.roomId, displayName: body.displayName });
	const res = await fetch("/api/rooms/join", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = await res.json();
	logger.info(L, "joinRoomApi result", { success: data.success, reason: data.reason });
	return data;
}

export async function startRoomApi(roomId: string) {
	logger.info(L, "startRoomApi", { roomId });
	const res = await fetch(`/api/rooms/${roomId}/start`, { method: "POST" });
	const data = await res.json();
	logger.info(L, "startRoomApi result", { success: data.success });
	return data;
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
	word: string,
	timeRemaining?: number
): Promise<SubmitWordApiResult> {
	logger.info(L, "submitWordApi", { word, timeRemaining });
	const res = await fetch(`/api/rooms/${roomId}/submit`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ word, timeRemaining }),
	});

	if (res.status !== 200) {
		logger.warn(L, "submitWordApi non-200", { status: res.status });
		return {
			success: false,
			reason: "Submit failed",
		};
	}

	let data: SubmitResult;
	try {
		const text = await res.clone().text();
		data = JSON.parse(text) as SubmitResult;
	} catch (error) {
		logger.error(L, "submitWordApi JSON parse failed", { error });
		data = { success: false, reason: "Invalid server response" } as SubmitResult;
	}
	const parsed = parseSubmitWordResponse(res, data);
	logger.info(L, "submitWordApi result", { success: parsed.success, reason: !parsed.success ? parsed.reason : undefined });
	return parsed;
}

export type TimerExpiryApiResult =
	| { success: true; gameState: GameStateEmit }
	| { success: false; reason: string };

export async function timerExpiryApi(roomId: string): Promise<TimerExpiryApiResult> {
	logger.info(L, "timerExpiryApi", { roomId });
	const res = await fetch(`/api/rooms/${roomId}/timer-expiry`, {
		method: "POST",
	});
	if (res.status !== 200) {
		logger.warn(L, "timerExpiryApi non-200", { status: res.status });
		return { success: false, reason: "Timer expiry request failed" };
	}
	const data = await res.json();
	logger.info(L, "timerExpiryApi result", { success: data.success });
	return data;
}

export async function leaveRoomApi(roomId: string) {
	logger.info(L, "leaveRoomApi", { roomId });
	const res = await fetch(`/api/rooms/${roomId}/leave`, {
		method: "POST",
		keepalive: true,
	});
	const data = await res.json() as Promise<{ dissolved: boolean; gameState: GameStateEmit | null }>;
	logger.info(L, "leaveRoomApi result", data);
	return data;
}

export async function dissolveRoomApi(roomId: string) {
	logger.info(L, "dissolveRoomApi", { roomId });
	const res = await fetch(`/api/rooms/${roomId}/dissolve`, {
		method: "POST",
		keepalive: true,
	});
	const data = await res.json() as Promise<{ dissolved: boolean }>;
	logger.info(L, "dissolveRoomApi result", data);
	return data;
}
