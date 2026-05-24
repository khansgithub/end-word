import { NextResponse } from "next/server";

/** Used by Playwright (and ops) to verify the dev server process is accepting requests. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
