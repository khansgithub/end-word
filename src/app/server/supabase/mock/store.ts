import type { RoomListItem, RoomRow } from "@/shared/roomTypes";
import { getRealtimeHub } from "@/app/server/supabase/mock/realtimeHub";

const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return code;
}

class MockRoomStore {
  private rooms = new Map<string, RoomRow>();

  allRooms(): RoomRow[] {
    return [...this.rooms.values()];
  }

  get(roomId: string): RoomRow | null {
    return this.rooms.get(roomId) ?? null;
  }

  getByInviteCode(code: string): RoomRow | null {
    const upper = code.toUpperCase();
    for (const row of this.rooms.values()) {
      if (row.invite_code === upper) return row;
    }
    return null;
  }

  listPublic(): RoomListItem[] {
    const items: RoomListItem[] = [];
    for (const row of this.rooms.values()) {
      if (row.is_private || row.archived_at) continue;
      if (row.status !== "waiting" && row.status !== "playing") continue;
      items.push({
        roomid: row.roomid,
        roomname: row.roomname,
        invite_code: row.invite_code,
        is_private: row.is_private,
        language: row.language,
        status: row.status,
        connected_players: row.connected_players,
        host_user_id: row.host_user_id,
      });
    }
    return items.sort((a, b) => {
      const au = this.rooms.get(a.roomid)?.updated_at ?? "";
      const bu = this.rooms.get(b.roomid)?.updated_at ?? "";
      return bu.localeCompare(au);
    });
  }

  insert(row: Omit<RoomRow, "created_at" | "updated_at">): RoomRow {
    const invite = row.invite_code.toUpperCase();
    for (const existing of this.rooms.values()) {
      if (existing.invite_code === invite) {
        const error = new Error("duplicate invite_code") as Error & { code?: string };
        error.code = "23505";
        throw error;
      }
    }

    const now = new Date().toISOString();
    const full: RoomRow = {
      ...row,
      invite_code: invite,
      created_at: now,
      updated_at: now,
    };
    this.rooms.set(full.roomid, full);
    getRealtimeHub().emitRoomUpdate(full.roomid, full);
    return full;
  }

  update(roomId: string, patch: Partial<RoomRow>): RoomRow {
    const existing = this.rooms.get(roomId);
    if (!existing) {
      const error = new Error("Room not found") as Error & { code?: string };
      error.code = "PGRST116";
      throw error;
    }
    const next: RoomRow = {
      ...existing,
      ...patch,
      roomid: existing.roomid,
      updated_at: patch.updated_at ?? new Date().toISOString(),
    };
    this.rooms.set(roomId, next);
    getRealtimeHub().emitRoomUpdate(roomId, next);
    return next;
  }

  reset(): void {
    this.rooms.clear();
    getRealtimeHub().reset();
  }
}

let store: MockRoomStore | null = null;

export function getMockRoomStore(): MockRoomStore {
  if (!store) store = new MockRoomStore();
  return store;
}

export function resetMockRoomStore(): void {
  store?.reset();
  store = null;
}

export { randomInviteCode };
