import { createAdminClient } from "@/app/server/supabase/index";
import { isMockSupabase } from "@/app/server/supabase/config";
import { getRealtimeHub } from "@/app/server/supabase/mock/realtimeHub";
import { fetchRoom } from "@/app/server/game/roomDb";
import type { DictionaryEntry, GameStateEmit } from "@/shared/types";
import { WORD_DEFINITION_EVENT } from "@/shared/wordDefinition";
import type { SupabaseClient } from "@supabase/supabase-js";

async function broadcastRoomEvent(
  roomId: string,
  event: string,
  payload: unknown
): Promise<void> {
  if (isMockSupabase()) {
    getRealtimeHub().emitClientBroadcast(`room:${roomId}`, event, payload);
    return;
  }

  const supabase = createAdminClient();
  const channel = supabase.channel(`room:${roomId}`);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      void supabase.removeChannel(channel);
      reject(new Error(`broadcastRoomEvent(${event}): subscribe timeout`));
    }, 10_000);

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      clearTimeout(timeout);
      const result = await channel.send({
        type: "broadcast",
        event,
        payload,
      });
      await supabase.removeChannel(channel);
      if (result === "ok") resolve();
      else reject(new Error(`broadcastRoomEvent(${event}): send failed (${result})`));
    });
  });
}

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

  await broadcastRoomEvent(roomId, "gameStateUpdate", emit);
}

/** Push a validated word definition to all clients in the room (word-history panel). */
export async function broadcastRoomWordDefinition(
  _admin: SupabaseClient,
  roomId: string,
  definition: DictionaryEntry
): Promise<void> {
  await broadcastRoomEvent(roomId, WORD_DEFINITION_EVENT, definition);
}
