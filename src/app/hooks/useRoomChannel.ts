"use client";

import { useSupabase } from "@/app/components/SupabaseProvider";
import { dissolveRoomApi } from "@/app/lib/roomApi";
import { isCompletedGameRow, rowToGameState } from "@/lib/game/roomDb";
import type { RoomRow } from "@/lib/game/roomTypes";
import { toGameStateEmit } from "@/shared/GameState";
import type { GameStateEmit } from "@/shared/types";
import { useEffect, useRef } from "react";

type RoomPresenceMeta = {
  user_id: string;
  is_host: boolean;
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
  }
) {
  const supabase = useSupabase();
  const { userId, isHost, onUpdate, onRoomClosed } = options;
  const onUpdateRef = useRef(onUpdate);
  const onRoomClosedRef = useRef(onRoomClosed);
  const dissolvedRef = useRef(false);
  const hostWasOnlineRef = useRef(false);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    onRoomClosedRef.current = onRoomClosed;
  }, [onRoomClosed]);

  useEffect(() => {
    dissolvedRef.current = false;
    hostWasOnlineRef.current = false;

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("broadcast", { event: "gameStateUpdate" }, ({ payload }) => {
        onUpdateRef.current(payload);
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
        if (isHost || dissolvedRef.current || !hostWasOnlineRef.current) return;
        const left = leftPresences as unknown as RoomPresenceMeta[];
        if (!presenceIncludesHost(left)) return;

        dissolvedRef.current = true;
        void dissolveRoomApi(roomId).finally(() => {
          onRoomClosedRef.current?.();
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, is_host: isHost });
        }
      });

    return () => {
      void channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase, userId, isHost]);
}
