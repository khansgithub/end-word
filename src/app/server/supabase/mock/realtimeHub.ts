import type { RoomRow } from "@/shared/roomTypes";
import type { GameStateEmit } from "@/shared/types";

export type RoomPresenceMeta = {
  user_id: string;
  is_host: boolean;
};

type SseClient = {
  id: string;
  channel: string;
  send: (data: unknown) => void;
  close: () => void;
};

type PresenceEntry = RoomPresenceMeta & { key: string };

type RealtimeEvent =
  | { type: "system"; event: "SUBSCRIBED" }
  | {
      type: "postgres_changes";
      event: "UPDATE";
      payload: { new: RoomRow };
    }
  | {
      type: "broadcast";
      event: "gameStateUpdate";
      payload: GameStateEmit;
    }
  | {
      type: "broadcast";
      event: string;
      payload: unknown;
    }
  | { type: "presence"; event: "sync" }
  | {
      type: "presence";
      event: "leave";
      leftPresences: RoomPresenceMeta[];
    };

class RealtimeHub {
  private sseClients = new Map<string, SseClient>();
  private presence = new Map<string, Map<string, PresenceEntry>>();
  private nextId = 0;

  private channelPresence(channel: string): Map<string, PresenceEntry> {
    let map = this.presence.get(channel);
    if (!map) {
      map = new Map();
      this.presence.set(channel, map);
    }
    return map;
  }

  presenceState(channel: string): Record<string, RoomPresenceMeta[]> {
    const map = this.presence.get(channel);
    if (!map) return {};
    const state: Record<string, RoomPresenceMeta[]> = {};
    for (const entry of map.values()) {
      const meta = { user_id: entry.user_id, is_host: entry.is_host };
      state[entry.key] = [meta];
    }
    return state;
  }

  subscribeSse(channel: string, send: (data: unknown) => void): () => void {
    const id = `sse-${++this.nextId}`;
    const client: SseClient = {
      id,
      channel,
      send,
      close: () => {
        this.sseClients.delete(id);
      },
    };
    this.sseClients.set(id, client);
    send({ type: "system", event: "SUBSCRIBED" } satisfies RealtimeEvent);
    this.broadcastPresence(channel, "sync");
    return () => {
      client.close();
    };
  }

  track(channel: string, key: string, meta: RoomPresenceMeta): void {
    this.channelPresence(channel).set(key, { ...meta, key });
    this.broadcastPresence(channel, "sync");
  }

  untrack(channel: string, key: string): void {
    const map = this.presence.get(channel);
    if (!map) return;
    const entry = map.get(key);
    if (!entry) return;
    map.delete(key);
    this.broadcastToChannel(channel, {
      type: "presence",
      event: "leave",
      leftPresences: [{ user_id: entry.user_id, is_host: entry.is_host }],
    });
    if (map.size === 0) this.presence.delete(channel);
  }

  emitRoomUpdate(roomId: string, row: RoomRow): void {
    const channel = `room:${roomId}`;
    this.broadcastToChannel(channel, {
      type: "postgres_changes",
      event: "UPDATE",
      payload: { new: row },
    });
  }

  emitGameStateBroadcast(roomId: string, emit: GameStateEmit): void {
    const channel = `room:${roomId}`;
    this.broadcastToChannel(channel, {
      type: "broadcast",
      event: "gameStateUpdate",
      payload: emit,
    });
  }

  emitClientBroadcast(channel: string, event: string, payload: unknown): void {
    this.broadcastToChannel(channel, {
      type: "broadcast",
      event,
      payload,
    });
  }

  private broadcastPresence(channel: string, event: "sync"): void {
    this.broadcastToChannel(channel, { type: "presence", event });
  }

  private broadcastToChannel(channel: string, event: RealtimeEvent): void {
    for (const client of this.sseClients.values()) {
      if (client.channel === channel) client.send(event);
    }
  }

  reset(): void {
    for (const client of this.sseClients.values()) client.close();
    this.sseClients.clear();
    this.presence.clear();
  }
}

let hub: RealtimeHub | null = null;

export function getRealtimeHub(): RealtimeHub {
  if (!hub) hub = new RealtimeHub();
  return hub;
}
