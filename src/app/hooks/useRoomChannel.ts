"use client";

import { useSupabase } from "@/app/components/SupabaseProvider";
import { dissolveRoomApi } from "@/lib/client/api/room";
import { toGameStateEmit } from "@/shared/GameState";
import { isCompletedGameRow, rowToGameState } from "@/shared/roomRow";
import type { RoomRow } from "@/shared/roomTypes";
import type { GameState, GameStateEmit, Spectator } from "@/shared/types";
import { TIMER_SYNC_EVENT, TIMER_SYNC_REQUEST_EVENT, type TimerSyncPayload } from "@/shared/timerSync";
import { TYPING_DRAFT_EVENT, type TypingDraftPayload } from "@/shared/typingDraft";
import { WORD_DEFINITION_EVENT, type WordDefinitionPayload } from "@/shared/wordDefinition";
import { SPECTATORS_UPDATE_EVENT } from "@/shared/spectatorsBroadcast";
import { EMOTE_EVENT, type EmotePayload } from "@/shared/emote";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef } from "react";
import { ConsoleTransport, LogLayer } from 'loglayer';

const L = "useRoomChannel";
const logger = new LogLayer({
	transport: new ConsoleTransport({
		logger: console,
		enabled: process.env.NODE_ENV !== "production",
		appendObjectData: true
	})
}).withPrefix(L)

type RoomPresenceMeta = {
	user_id: string;
	is_host: boolean;
	seat?: number;
};

function presenceIncludesHost(presences: RoomPresenceMeta[]): boolean {
	return presences.some((p) => p.is_host);
}

function flattenPresence(
	state: Record<string, RoomPresenceMeta[]>
): RoomPresenceMeta[] {
	return Object.values(state).flat();
}

export function useRoomChannel(
	roomId: string,
	options: {
		userId: string;
		isHost: boolean;
		onUpdate: (emit: GameStateEmit) => void;
		onRoomClosed?: () => void;
		onTimerSync?: (payload: TimerSyncPayload) => void;
		onTimerSyncRequest?: () => void;
		onTypingDraft?: (payload: TypingDraftPayload) => void;
		onWordDefinition?: (definition: WordDefinitionPayload) => void;
		onSpectatorsUpdate?: (spectators: Spectator[]) => void;
		onEmote?: (payload: EmotePayload) => void;
		onPlayerLeft?: (leavingPlayers: Array<{ userId: string; seat: number }>) => GameStateEmit | null | undefined;
		presenceSeat?: number;
	}
) {
	const supabase = useSupabase();
	const { userId, isHost, onUpdate, onRoomClosed, onTimerSync, onTimerSyncRequest, onTypingDraft, onWordDefinition, onSpectatorsUpdate, onEmote, onPlayerLeft, presenceSeat } = options;
	const onUpdateRef = useRef(onUpdate);
	const onRoomClosedRef = useRef(onRoomClosed);
	const onTimerSyncRef = useRef(onTimerSync);
	const onTimerSyncRequestRef = useRef(onTimerSyncRequest);
	const onTypingDraftRef = useRef(onTypingDraft);
	const onWordDefinitionRef = useRef(onWordDefinition);
	const onSpectatorsUpdateRef = useRef(onSpectatorsUpdate);
	const onEmoteRef = useRef(onEmote);
	const onPlayerLeftRef = useRef(onPlayerLeft);
	const channelRef = useRef<RealtimeChannel | null>(null);
	const subscribedRef = useRef(false);
	const dissolvedRef = useRef(false);
	const hostWasOnlineRef = useRef(false);

	useEffect(() => {
		onUpdateRef.current = onUpdate;
	}, [onUpdate]);

	useEffect(() => {
		onRoomClosedRef.current = onRoomClosed;
	}, [onRoomClosed]);

	useEffect(() => {
		onTimerSyncRef.current = onTimerSync;
	}, [onTimerSync]);

	useEffect(() => {
		onTimerSyncRequestRef.current = onTimerSyncRequest;
	}, [onTimerSyncRequest]);

	useEffect(() => {
		onTypingDraftRef.current = onTypingDraft;
	}, [onTypingDraft]);

	useEffect(() => {
		onWordDefinitionRef.current = onWordDefinition;
	}, [onWordDefinition]);

	useEffect(() => {
		onPlayerLeftRef.current = onPlayerLeft;
	}, [onPlayerLeft]);

	useEffect(() => {
		onSpectatorsUpdateRef.current = onSpectatorsUpdate;
	}, [onSpectatorsUpdate]);

	useEffect(() => {
		onEmoteRef.current = onEmote;
	}, [onEmote]);

	/** Re-track presence whenever seat changes so other clients can identify this client by seat. */
	useEffect(() => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
		logger.withMetadata({ userId, isHost, presenceSeat }).debug("re-tracking presence");
		void channel.track({
			user_id: userId,
			is_host: isHost,
			...(presenceSeat !== undefined ? { seat: presenceSeat } : {}),
		});
	}, [userId, isHost, presenceSeat]);

	useEffect(() => {
		dissolvedRef.current = false;
		hostWasOnlineRef.current = false;
		subscribedRef.current = false;

		logger.withMetadata({ roomId, userId, isHost }).info("creating channel");
		const channel = supabase.channel(`room:${roomId}`, {
			config: { presence: { key: userId } },
		});

		channelRef.current = channel;

		channel
			.on("broadcast", { event: "gameStateUpdate" }, ({ payload }) => {
				logger.withMetadata({ turn: (payload as GameStateEmit).turn, status: (payload as GameStateEmit).status }).debug("broadcast gameStateUpdate");
				onUpdateRef.current(payload);
			})
			.on("broadcast", { event: TIMER_SYNC_EVENT }, ({ payload }) => {
				const ts = payload as TimerSyncPayload;
				logger.withMetadata(ts).debug("broadcast timerSync");
				onTimerSyncRef.current?.(ts);
			})
			.on("broadcast", { event: TIMER_SYNC_REQUEST_EVENT }, () => {
				logger.debug("broadcast timerSyncRequest");
				onTimerSyncRequestRef.current?.();
			})
			.on("broadcast", { event: TYPING_DRAFT_EVENT }, ({ payload }) => {
				const td = payload as TypingDraftPayload;
				logger.withMetadata({ userId: td.userId, seat: td.seat, textLength: td.text?.length }).debug("broadcast typingDraft");
				onTypingDraftRef.current?.(td);
			})
			.on("broadcast", { event: WORD_DEFINITION_EVENT }, ({ payload }) => {
				const wd = payload as WordDefinitionPayload;
				logger.withMetadata({ key: wd.key }).debug("broadcast wordDefinition");
				onWordDefinitionRef.current?.(wd);
			})
			.on("broadcast", { event: SPECTATORS_UPDATE_EVENT }, ({ payload }) => {
				const sp = payload as Spectator[];
				logger.withMetadata({ count: sp.length }).debug("broadcast spectatorsUpdate");
				onSpectatorsUpdateRef.current?.(sp);
			})
			.on("broadcast", { event: EMOTE_EVENT }, ({ payload }) => {
				const em = payload as EmotePayload;
				logger.withMetadata({ seat: em.seat, value: em.value }).debug("broadcast emote");
				onEmoteRef.current?.(em);
			})
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "rooms",
					filter: `roomid=eq.${roomId}`,
				},
				(payload) => {
					const row = payload.new as RoomRow;
					const serverState = rowToGameState(row);
					const emit = toGameStateEmit(serverState);

					logger.withMetadata({ status: row.status, turn: row.turn, archived: !!row.archived_at }).debug("postgres_changes UPDATE");

					if (row.archived_at) {
						if (isCompletedGameRow(row)) {
							logger.info("game completed (archived)");
							onUpdateRef.current(emit);
							return;
						}
						if (!dissolvedRef.current) {
							dissolvedRef.current = true;
							logger.info("room dissolved (archived)");
							onRoomClosedRef.current?.();
						}
						return;
					}

					onUpdateRef.current(emit);
				}
			)
			.on("presence", { event: "sync" }, () => {
				const presences = flattenPresence(channel.presenceState());
				const hostOnline = presenceIncludesHost(presences);
				logger.withMetadata({ total: presences.length, hostOnline }).debug("presence sync");
				if (hostOnline) {
					hostWasOnlineRef.current = true;
				}
			})
			.on("presence", { event: "leave" }, ({ leftPresences }) => {
				const left = leftPresences as unknown as RoomPresenceMeta[];
				logger.withMetadata({ count: left.length, leftIds: left.map(p => p.user_id) }).debug("presence leave");

				if (isHost) {
					const leaving = left
						.filter((p): p is RoomPresenceMeta & { seat: number } => !p.is_host && p.seat !== undefined);
					if (leaving.length === 0) return;

					logger.withMetadata({ leaving: leaving.map(p => ({ userId: p.user_id, seat: p.seat })) }).info("players left, updating state as host");
					const newState = onPlayerLeftRef.current?.(leaving.map((p) => ({ userId: p.user_id, seat: p.seat })));
					if (newState) {
						onUpdateRef.current(newState);
						void channel.send({
							type: "broadcast",
							event: "gameStateUpdate",
							payload: newState,
						});
					}
					return;
				}

				if (dissolvedRef.current || !hostWasOnlineRef.current) return;
				if (!presenceIncludesHost(left)) return;

				logger.info("host left, dissolving room as non-host");
				dissolvedRef.current = true;
				void dissolveRoomApi(roomId).finally(() => {
					onRoomClosedRef.current?.();
				});
			})
			.subscribe(async (status) => {
				logger.withMetadata({ status }).info("channel subscribe status");
				if (status === "SUBSCRIBED") {
					subscribedRef.current = true;
					logger.withMetadata({ userId, isHost, presenceSeat }).info("channel subscribed, tracking presence");
					await channel.track({
						user_id: userId,
						is_host: isHost,
						...(presenceSeat !== undefined ? { seat: presenceSeat } : {}),
					});
				}
			});

		return () => {
			subscribedRef.current = false;
			channelRef.current = null;
			logger.info("channel cleanup (unsubscribe)");
			void channel.untrack();
			supabase.removeChannel(channel);
		};
	}, [roomId, supabase, userId, isHost]);

	const sendTypingDraft = useCallback((text: string, seat: number) => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
		logger.withMetadata({ textLength: text.length, seat }).debug("sendTypingDraft");
		void channel.send({
			type: "broadcast",
			event: TYPING_DRAFT_EVENT,
			payload: { userId, seat, text } satisfies TypingDraftPayload,
		});
	}, [userId]);

	const sendTimerSync = useCallback((payload: TimerSyncPayload) => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
		logger.withMetadata(payload).debug("sendTimerSync");
		void channel.send({
			type: "broadcast",
			event: TIMER_SYNC_EVENT,
			payload,
		});
	}, []);

	const sendTimerSyncRequest = useCallback(() => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
		logger.debug("sendTimerSyncRequest");
		void channel.send({
			type: "broadcast",
			event: TIMER_SYNC_REQUEST_EVENT,
			payload: {},
		});
	}, []);

	const sendEmote = useCallback((payload: EmotePayload) => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
		logger.withMetadata({ seat: payload.seat, value: payload.value }).debug("sendEmote");
		void channel.send({
			type: "broadcast",
			event: EMOTE_EVENT,
			payload,
		});
	}, []);

	return { sendTypingDraft, sendTimerSync, sendTimerSyncRequest, sendEmote };
}