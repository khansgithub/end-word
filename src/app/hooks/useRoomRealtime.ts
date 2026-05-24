"use client";

import { useSupabase } from "@/app/components/SupabaseProvider";
import type { GameStateEmit } from "@/shared/types";
import { useEffect } from "react";

/**
 * Debounce coalesces bursty UPDATE notifications. We refetch via the API instead of using
 * `payload.new` alone so clients never apply a stale or reordered Realtime row snapshot.
 *
 * On `SUBSCRIBED` we pull immediately so React Strict Mode (effect cleanup clears debounce timers)
 * cannot miss the only postgres_changes event for a given DB write.
 */
const REFETCH_DEBOUNCE_MS = 50;

export function useRoomRealtime(
  roomId: string,
  onUpdate: (emit: GameStateEmit) => void
) {
  const supabase = useSupabase();

  useEffect(() => {
    let mounted = true;
    let debounceId: ReturnType<typeof setTimeout> | undefined;

    const pullAuthoritativeState = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        if (!res.ok || !mounted) return;
        const data = (await res.json()) as { gameState?: GameStateEmit };
        if (data.gameState && mounted) onUpdate(data.gameState);
      } catch {
        /* ignore network / parse errors */
      }
    };

    const schedulePull = () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => void pullAuthoritativeState(), REFETCH_DEBOUNCE_MS);
    };

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
        () => {
          schedulePull();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void pullAuthoritativeState();
        }
      });

    return () => {
      mounted = false;
      clearTimeout(debounceId);
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase, onUpdate]);
}
