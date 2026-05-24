import { afterEach, describe, expect, it } from "vitest";
import { envSet } from "@/server/env";
import { createAdminClient } from "@/lib/supabase";
import { resetMockRoomStore } from "@/lib/supabase/mock/store";
import { createRoom, joinRoom, startGame } from "@/lib/game/roomService";
import { fetchRoom } from "@/lib/game/roomDb";
import { getRealtimeHub } from "@/lib/supabase/mock/realtimeHub";

describe("mock supabase", () => {
  afterEach(() => {
    resetMockRoomStore();
  });

  it("persists rooms and emits realtime updates", async () => {
    envSet("MOCK_SUPABASE", "true");
    const admin = createAdminClient();
    const hostId = "host-user-1";

    const events: unknown[] = [];
    getRealtimeHub().subscribeSse("room:pending", () => {});
    const room = await createRoom(admin, hostId, {
      roomName: "Test",
      language: "ko",
      isPrivate: false,
    });

    const channel = `room:${room.roomid}`;
    const unsubscribe = getRealtimeHub().subscribeSse(channel, (ev) => events.push(ev));

    const hostJoin = await joinRoom(admin, room.roomid, hostId, "Host");
    expect(hostJoin.success).toBe(true);

    const join = await joinRoom(admin, room.roomid, "player-2", "P2");
    expect(join.success).toBe(true);

    const row = await fetchRoom(admin, room.roomid);
    expect(row?.connected_players).toBe(2);

    const started = await startGame(admin, room.roomid, hostId);
    expect(started.success).toBe(true);

    const playing = await fetchRoom(admin, room.roomid);
    expect(playing?.status).toBe("playing");

    expect(events.some((e) => (e as { type?: string }).type === "postgres_changes")).toBe(
      true
    );

    unsubscribe();
  });
});
