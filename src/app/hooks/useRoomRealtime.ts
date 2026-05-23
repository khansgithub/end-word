"use client";

import { useSupabase } from "@/app/components/SupabaseProvider";
import { rowToGameState } from "@/lib/game/roomDb";
import type { RoomRow } from "@/lib/game/roomTypes";
import { toGameStateEmit } from "@/shared/GameState";
import type { GameStateEmit } from "@/shared/types";
import { useEffect } from "react";

export function useRoomRealtime(
  roomId: string,
  onUpdate: (emit: GameStateEmit) => void
) {
  const supabase = useSupabase();

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
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
          onUpdate(toGameStateEmit(serverState));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase, onUpdate]);
}
