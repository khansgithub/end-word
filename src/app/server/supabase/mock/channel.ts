"use client";

import type { RoomRow } from "@/shared/roomTypes";
import type { GameStateEmit } from "@/shared/types";
import type { RoomPresenceMeta } from "@/app/server/supabase/mock/realtimeHub";

type PostgresHandler = (payload: { new: RoomRow }) => void;
type BroadcastHandler<T = unknown> = (payload: { payload: T }) => void;
type PresenceSyncHandler = () => void;
type PresenceLeaveHandler = (payload: { leftPresences: RoomPresenceMeta[] }) => void;
type SubscribeCallback = (status: string) => void;

type ChannelSendMessage = {
  type: "broadcast";
  event: string;
  payload: unknown;
};

export class MockRealtimeChannel {
  private postgresHandlers: PostgresHandler[] = [];
  private broadcastHandlers = new Map<string, BroadcastHandler[]>();
  private presenceSyncHandlers: PresenceSyncHandler[] = [];
  private presenceLeaveHandlers: PresenceLeaveHandler[] = [];
  private presenceCache: Record<string, RoomPresenceMeta[]> = {};
  private subscribed = false;
  private eventSource: EventSource | null = null;
  private presenceKey: string | null = null;

  constructor(
    private readonly channelName: string,
    private readonly config?: { presence?: { key?: string } }
  ) {
    this.presenceKey = config?.presence?.key ?? null;
  }

  on(
    event: "postgres_changes",
    filter: {
      event: string;
      schema: string;
      table: string;
      filter?: string;
    },
    callback: PostgresHandler
  ): this;
  on(
    event: "broadcast",
    filter: { event: string },
    callback: BroadcastHandler
  ): this;
  on(
    event: "presence",
    filter: { event: "sync" | "leave" },
    callback: PresenceSyncHandler | PresenceLeaveHandler
  ): this;
  on(event: string, filter: unknown, callback: unknown): this {
    if (event === "postgres_changes") {
      this.postgresHandlers.push(callback as PostgresHandler);
      return this;
    }
    if (event === "broadcast") {
      const broadcastEvent = (filter as { event: string }).event;
      const list = this.broadcastHandlers.get(broadcastEvent) ?? [];
      list.push(callback as BroadcastHandler);
      this.broadcastHandlers.set(broadcastEvent, list);
      return this;
    }
    if (event === "presence") {
      const f = filter as { event: string };
      if (f.event === "sync") {
        this.presenceSyncHandlers.push(callback as PresenceSyncHandler);
      } else if (f.event === "leave") {
        this.presenceLeaveHandlers.push(callback as PresenceLeaveHandler);
      }
    }
    return this;
  }

  presenceState(): Record<string, RoomPresenceMeta[]> {
    return this.presenceCache;
  }

  async send(message: ChannelSendMessage): Promise<"ok" | "error"> {
    const res = await fetch("/api/mock-supabase/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: this.channelName,
        event: message.event,
        payload: message.payload,
      }),
    });
    return res.ok ? "ok" : "error";
  }

  async track(meta: RoomPresenceMeta): Promise<void> {
    if (!this.presenceKey) return;
    await fetch("/api/mock-supabase/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: this.channelName,
        key: this.presenceKey,
        meta,
      }),
    });
  }

  async untrack(): Promise<void> {
    if (!this.presenceKey) return;
    await fetch("/api/mock-supabase/presence", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: this.channelName,
        key: this.presenceKey,
      }),
    });
  }

  subscribe(callback?: SubscribeCallback): MockRealtimeChannel {
    const params = new URLSearchParams({ channel: this.channelName });
    if (this.presenceKey) params.set("presenceKey", this.presenceKey);
    this.eventSource = new EventSource(`/api/mock-supabase/realtime?${params}`);

    this.eventSource.onmessage = (ev) => {
      let msg: {
        type: string;
        event?: string;
        payload?: { new: RoomRow } | GameStateEmit;
        leftPresences?: RoomPresenceMeta[];
      };
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (msg.type === "system" && msg.event === "SUBSCRIBED") {
        this.subscribed = true;
        callback?.("SUBSCRIBED");
        return;
      }

      if (msg.type === "postgres_changes" && msg.payload && "new" in msg.payload) {
        for (const handler of this.postgresHandlers) handler(msg.payload);
        return;
      }

      if (msg.type === "broadcast" && msg.event && msg.payload !== undefined) {
        const handlers = this.broadcastHandlers.get(msg.event);
        if (handlers) {
          for (const handler of handlers) {
            handler({ payload: msg.payload });
          }
        }
        return;
      }

      if (msg.type === "presence" && msg.event === "sync") {
        void this.refreshPresenceState();
        for (const handler of this.presenceSyncHandlers) handler();
        return;
      }

      if (msg.type === "presence" && msg.event === "leave" && msg.leftPresences) {
        void this.refreshPresenceState();
        for (const handler of this.presenceLeaveHandlers) {
          handler({ leftPresences: msg.leftPresences! });
        }
      }
    };

    this.eventSource.onerror = () => {
      callback?.("CHANNEL_ERROR");
    };

    return this;
  }

  private async refreshPresenceState(): Promise<void> {
    const params = new URLSearchParams({ channel: this.channelName });
    const res = await fetch(`/api/mock-supabase/presence?${params}`);
    if (!res.ok) return;
    const data = (await res.json()) as { state: Record<string, RoomPresenceMeta[]> };
    this.presenceCache = data.state ?? {};
  }
}
