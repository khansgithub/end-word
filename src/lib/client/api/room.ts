import type { RoomListItem } from "@/shared/roomTypes";
import type { DictionaryEntry, GameLanguage, GameStateEmit, PlayerWithId, SubmitResult } from "@/shared/types";
import { ConsoleTransport, LogLayer } from 'loglayer';

const L = "RoomAPI";
const logger = new LogLayer({
	transport: new ConsoleTransport({
		logger: console,
		enabled: process.env.NODE_ENV !== "production",
		appendObjectData: true
	})
}).withPrefix(L)

export async function fetchLobbyRooms(): Promise<RoomListItem[]> {
	// logger.debug("fetchLobbyRooms");
	const res = await fetch("/api/rooms");
	if (!res.ok) throw new Error("Failed to load lobby");
	const data = await res.json();
	// logger.withMetadata({ count: data.rooms?.length }).info("fetchLobbyRooms success");
	return data.rooms as RoomListItem[];
}

export async function createRoomApi(options: {
	roomName: string;
	language: GameLanguage;
	isPrivate: boolean;
	timerDuration?: number;
}) {
	logger.withMetadata(options).info("createRoomApi");
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
	logger.withMetadata({ roomId: body.roomId, displayName: body.displayName }).info("joinRoomApi");
	const res = await fetch("/api/rooms/join", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = await res.json();
	logger.withMetadata({ success: data.success, reason: data.reason }).info("joinRoomApi result");
	return data;
}

export async function startRoomApi(roomId: string) {
	logger.withMetadata({ roomId }).info("startRoomApi");
	const res = await fetch(`/api/rooms/${roomId}/start`, { method: "POST" });
	const data = await res.json();
	logger.withMetadata({ success: data.success }).info("startRoomApi result");
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
	logger.withMetadata({ word, timeRemaining }).info("submitWordApi");
	const res = await fetch(`/api/rooms/${roomId}/submit`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ word, timeRemaining }),
	});

	if (res.status !== 200) {
		logger.withMetadata({ status: res.status }).warn("submitWordApi non-200");
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
		logger.withMetadata({ error }).error("submitWordApi JSON parse failed");
		data = { success: false, reason: "Invalid server response" } as SubmitResult;
	}
	const parsed = parseSubmitWordResponse(res, data);
	logger.withMetadata({ success: parsed.success, reason: !parsed.success ? parsed.reason : undefined }).info("submitWordApi result");
	return parsed;
}

export type TimerExpiryApiResult =
	| { success: true; gameState: GameStateEmit }
	| { success: false; reason: string };

export async function timerExpiryApi(roomId: string): Promise<TimerExpiryApiResult> {
	logger.withMetadata({ roomId }).info("timerExpiryApi");
	const res = await fetch(`/api/rooms/${roomId}/timer-expiry`, {
		method: "POST",
	});
	if (res.status !== 200) {
		logger.withMetadata({ status: res.status }).warn("timerExpiryApi non-200");
		return { success: false, reason: "Timer expiry request failed" };
	}
	const data = await res.json();
	logger.withMetadata({ success: data.success }).info("timerExpiryApi result");
	return data;
}

export async function leaveRoomApi(roomId: string) {
	logger.withMetadata({ roomId }).info("leaveRoomApi");
	const res = await fetch(`/api/rooms/${roomId}/leave`, {
		method: "POST",
		keepalive: true,
	});
	const data = await res.json() as Promise<{ dissolved: boolean; gameState: GameStateEmit | null }>;
	logger.withMetadata(data).info("leaveRoomApi result");
	return data;
}

export async function dissolveRoomApi(roomId: string) {
	logger.withMetadata({ roomId }).info("dissolveRoomApi");
	const res = await fetch(`/api/rooms/${roomId}/dissolve`, {
		method: "POST",
		keepalive: true,
	});
	const data = await res.json() as Promise<{ dissolved: boolean }>;
	logger.withMetadata(data).info("dissolveRoomApi result");
	return data;
}
