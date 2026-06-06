import { NextResponse } from "next/server";
import { isMockSupabase } from "@/app/server/supabase/config";
import { getRealtimeHub } from "@/app/server/supabase/mock/realtimeHub";
import type { RoomPresenceMeta } from "@/app/server/supabase/mock/realtimeHub";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isMockSupabase()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const channel = new URL(request.url).searchParams.get("channel");
  if (!channel) {
    return NextResponse.json({ error: "channel required" }, { status: 400 });
  }

  return NextResponse.json({ state: getRealtimeHub().presenceState(channel) });
}

export async function POST(request: Request) {
  if (!isMockSupabase()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    channel: string;
    key: string;
    meta: RoomPresenceMeta;
  };

  if (!body.channel || !body.key || !body.meta) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  getRealtimeHub().track(body.channel, body.key, body.meta);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isMockSupabase()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as { channel: string; key: string };
  if (!body.channel || !body.key) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  getRealtimeHub().untrack(body.channel, body.key);
  return NextResponse.json({ ok: true });
}
