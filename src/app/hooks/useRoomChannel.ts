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
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef } from "react";
import { logger } from "@/lib/client/logging";

const L = "useRoomChannel";

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
		onPlayerLeft?: (leavingPlayers: Array<{ userId: string; seat: number }>) => GameStateEmit | null | undefined;
		presenceSeat?: number;
	}
) {
	const supabase = useSupabase();
	const { userId, isHost, onUpdate, onRoomClosed, onTimerSync, onTimerSyncRequest, onTypingDraft, onWordDefinition, onSpectatorsUpdate, onPlayerLeft, presenceSeat } = options;
	const onUpdateRef = useRef(onUpdate);
	const onRoomClosedRef = useRef(onRoomClosed);
	const onTimerSyncRef = useRef(onTimerSync);
	const onTimerSyncRequestRef = useRef(onTimerSyncRequest);
	const onTypingDraftRef = useRef(onTypingDraft);
	const onWordDefinitionRef = useRef(onWordDefinition);
	const onSpectatorsUpdateRef = useRef(onSpectatorsUpdate);
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

	/** Re-track presence whenever seat changes so other clients can identify this client by seat. */
	useEffect(() => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
		logger.debug(L, "re-tracking presence", { userId, isHost, presenceSeat });
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

		logger.info(L, "creating channel", { roomId, userId, isHost });
		const channel = supabase.channel(`room:${roomId}`, {
			config: { presence: { key: userId } },
		});

		channelRef.current = channel;

		channel
			.on("broadcast", { event: "gameStateUpdate" }, ({ payload }) => {
				logger.debug(L, "broadcast gameStateUpdate", { turn: (payload as GameStateEmit).turn, status: (payload as GameStateEmit).status });
				onUpdateRef.current(payload);
			})
			.on("broadcast", { event: TIMER_SYNC_EVENT }, ({ payload }) => {
				const ts = payload as TimerSyncPayload;
				logger.debug(L, "broadcast timerSync", ts);
				onTimerSyncRef.current?.(ts);
			})
			.on("broadcast", { event: TIMER_SYNC_REQUEST_EVENT }, () => {
				logger.debug(L, "broadcast timerSyncRequest");
				onTimerSyncRequestRef.current?.();
			})
			.on("broadcast", { event: TYPING_DRAFT_EVENT }, ({ payload }) => {
				const td = payload as TypingDraftPayload;
				logger.debug(L, "broadcast typingDraft", { userId: td.userId, seat: td.seat, textLength: td.text?.length });
				onTypingDraftRef.current?.(td);
			})
			.on("broadcast", { event: WORD_DEFINITION_EVENT }, ({ payload }) => {
				const wd = payload as WordDefinitionPayload;
				logger.debug(L, "broadcast wordDefinition", { key: wd.key });
				onWordDefinitionRef.current?.(wd);
			})
			.on("broadcast", { event: SPECTATORS_UPDATE_EVENT }, ({ payload }) => {
				const sp = payload as Spectator[];
				logger.debug(L, "broadcast spectatorsUpdate", { count: sp.length });
				onSpectatorsUpdateRef.current?.(sp);
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

					logger.debug(L, "postgres_changes UPDATE", { status: row.status, turn: row.turn, archived: !!row.archived_at });

					if (row.archived_at) {
						if (isCompletedGameRow(row)) {
							logger.info(L, "game completed (archived)");
							onUpdateRef.current(emit);
							return;
						}
						if (!dissolvedRef.current) {
							dissolvedRef.current = true;
							logger.info(L, "room dissolved (archived)");
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
				logger.debug(L, "presence sync", { total: presences.length, hostOnline });
				if (hostOnline) {
					hostWasOnlineRef.current = true;
				}
			})
			.on("presence", { event: "leave" }, ({ leftPresences }) => {
				const left = leftPresences as unknown as RoomPresenceMeta[];
				logger.debug(L, "presence leave", { count: left.length, leftIds: left.map(p => p.user_id) });

				if (isHost) {
					const leaving = left
						.filter((p): p is RoomPresenceMeta & { seat: number } => !p.is_host && p.seat !== undefined);
					if (leaving.length === 0) return;

					logger.info(L, "players left, updating state as host", { leaving: leaving.map(p => ({ userId: p.user_id, seat: p.seat })) });
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

				logger.info(L, "host left, dissolving room as non-host");
				dissolvedRef.current = true;
				void dissolveRoomApi(roomId).finally(() => {
					onRoomClosedRef.current?.();
				});
			})
			.subscribe(async (status) => {
				logger.info(L, "channel subscribe status", { status });
				if (status === "SUBSCRIBED") {
					subscribedRef.current = true;
					logger.info(L, "channel subscribed, tracking presence", { userId, isHost, presenceSeat });
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
			logger.info(L, "channel cleanup (unsubscribe)");
			void channel.untrack();
			supabase.removeChannel(channel);
		};
	}, [roomId, supabase, userId, isHost]);

	const sendTypingDraft = useCallback((text: string, seat: number) => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
		logger.debug(L, "sendTypingDraft", { textLength: text.length, seat });
		void channel.send({
			type: "broadcast",
			event: TYPING_DRAFT_EVENT,
			payload: { userId, seat, text } satisfies TypingDraftPayload,
		});
	}, [userId]);

	const sendTimerSync = useCallback((payload: TimerSyncPayload) => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
		logger.debug(L, "sendTimerSync", payload);
		void channel.send({
			type: "broadcast",
			event: TIMER_SYNC_EVENT,
			payload,
		});
	}, []);

	const sendTimerSyncRequest = useCallback(() => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
		logger.debug(L, "sendTimerSyncRequest");
		void channel.send({
			type: "broadcast",
			event: TIMER_SYNC_REQUEST_EVENT,
			payload: {},
		});
	}, []);

	return { sendTypingDraft, sendTimerSync, sendTimerSyncRequest };
}