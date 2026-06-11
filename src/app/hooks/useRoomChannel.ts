"use client";

import { useSupabase } from "@/app/components/SupabaseProvider";
import { dissolveRoomApi } from "@/lib/client/api/room";
import { toGameStateEmit } from "@/shared/GameState";
import { isCompletedGameRow, rowToGameState } from "@/shared/roomRow";
import type { RoomRow } from "@/shared/roomTypes";
import type { GameStateEmit } from "@/shared/types";
import { TYPING_DRAFT_EVENT, type TypingDraftPayload } from "@/shared/typingDraft";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef } from "react";

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
		onTypingDraft?: (payload: TypingDraftPayload) => void;
		onPlayerLeft?: (leavingPlayers: Array<{ userId: string; seat: number }>) => GameStateEmit | null | undefined;
		presenceSeat?: number;
	}
) {
	const supabase = useSupabase();
	const { userId, isHost, onUpdate, onRoomClosed, onTypingDraft, onPlayerLeft, presenceSeat } = options;
	const onUpdateRef = useRef(onUpdate);
	const onRoomClosedRef = useRef(onRoomClosed);
	const onTypingDraftRef = useRef(onTypingDraft);
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
		onTypingDraftRef.current = onTypingDraft;
	}, [onTypingDraft]);

	useEffect(() => {
		onPlayerLeftRef.current = onPlayerLeft;
	}, [onPlayerLeft]);

	/** Re-track presence whenever seat changes so other clients can identify this client by seat. */
	useEffect(() => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
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

		const channel = supabase.channel(`room:${roomId}`, {
			config: { presence: { key: userId } },
		});

		channelRef.current = channel;

		channel
			.on("broadcast", { event: "gameStateUpdate" }, ({ payload }) => {
				onUpdateRef.current(payload);
			})
			.on("broadcast", { event: TYPING_DRAFT_EVENT }, ({ payload }) => {
				onTypingDraftRef.current?.(payload as TypingDraftPayload);
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

					if (row.archived_at) {
						if (isCompletedGameRow(row)) {
							onUpdateRef.current(emit);
							return;
						}
						if (!dissolvedRef.current) {
							dissolvedRef.current = true;
							onRoomClosedRef.current?.();
						}
						return;
					}

					onUpdateRef.current(emit);
				}
			)
			.on("presence", { event: "sync" }, () => {
				if (presenceIncludesHost(flattenPresence(channel.presenceState()))) {
					hostWasOnlineRef.current = true;
				}
			})
			.on("presence", { event: "leave" }, ({ leftPresences }) => {
				const left = leftPresences as unknown as RoomPresenceMeta[];

				if (isHost) {
					const leaving = left
						.filter((p): p is RoomPresenceMeta & { seat: number } => !p.is_host && p.seat !== undefined);
					if (leaving.length === 0) return;

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

				dissolvedRef.current = true;
				void dissolveRoomApi(roomId).finally(() => {
					onRoomClosedRef.current?.();
				});
			})
			.subscribe(async (status) => {
				if (status === "SUBSCRIBED") {
					subscribedRef.current = true;
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
			void channel.untrack();
			supabase.removeChannel(channel);
		};
	}, [roomId, supabase, userId, isHost]);

	const sendTypingDraft = useCallback((text: string, seat: number) => {
		const channel = channelRef.current;
		if (!channel || !subscribedRef.current) return;
		void channel.send({
			type: "broadcast",
			event: TYPING_DRAFT_EVENT,
			payload: { userId, seat, text } satisfies TypingDraftPayload,
		});
	}, [userId]);

	return { sendTypingDraft };
}
