import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/lib/auth/session";
import { submitWord } from "@/lib/game/roomService";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roomId } = await params;
    const body = await request.json();
    const word = String(body.word ?? "");
    const admin = getAdmin();
    const result = await submitWord(admin, roomId, user.id, word);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e) {
    console.error("[POST /api/rooms/:id/submit]", e);
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
