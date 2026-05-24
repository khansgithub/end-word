import { createAdminClient } from "@/lib/supabase/admin";
import { isMockSupabase } from "@/lib/supabase/config";
import { getRealtimeHub } from "@/lib/supabase/mock/realtimeHub";
import { fetchRoom } from "@/lib/game/roomDb";
import { toGameStateEmit } from "@/shared/GameState";
import type { GameStateEmit } from "@/shared/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Push game state to everyone subscribed on `room:{roomId}` (bypasses postgres_changes RLS). */
export async function broadcastRoomGameState(
  admin: SupabaseClient,
  roomId: string,
  emit: GameStateEmit
): Promise<void> {
  if (isMockSupabase()) {
    const row = await fetchRoom(admin, roomId);
    if (row) getRealtimeHub().emitGameStateBroadcast(roomId, emit);
    return;
  }

  const supabase = createAdminClient();
  const channel = supabase.channel(`room:${roomId}`);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      void supabase.removeChannel(channel);
      reject(new Error("broadcastRoomGameState: subscribe timeout"));
    }, 10_000);

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      clearTimeout(timeout);
      const result = await channel.send({
        type: "broadcast",
        event: "gameStateUpdate",
        payload: emit,
      });
      await supabase.removeChannel(channel);
      if (result === "ok") resolve();
      else reject(new Error(`broadcastRoomGameState: send failed (${result})`));
    });
  });
}
