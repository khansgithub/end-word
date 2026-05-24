import { NextResponse } from "next/server";
import { isMockSupabase } from "@/lib/supabase/config";
import { resetMockRoomStore } from "@/lib/supabase/mock/store";

export const dynamic = "force-dynamic";

/** Clears in-memory mock data (test helper). */
export async function POST() {
  if (!isMockSupabase()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  resetMockRoomStore();
  return NextResponse.json({ ok: true });
}
