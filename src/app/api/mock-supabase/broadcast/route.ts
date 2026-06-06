import { isMockSupabase } from "@/app/server/supabase/config";
import { getRealtimeHub } from "@/app/server/supabase/mock/realtimeHub";
import { readMockUserIdFromRequest } from "@/app/server/supabase/mock/createClient";
import { TYPING_DRAFT_EVENT } from "@/shared/typingDraft";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS: ReadonlySet<string> = new Set([TYPING_DRAFT_EVENT]);

export async function POST(request: Request) {
	if (!isMockSupabase()) {
		return new Response("Not found", { status: 404 });
	}

	void readMockUserIdFromRequest(request);

	let body: { channel?: string; event?: string; payload?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return Response.json({ error: "invalid json" }, { status: 400 });
	}

	const { channel, event, payload } = body;
	if (!channel || !event || !ALLOWED_EVENTS.has(event)) {
		return Response.json({ error: "invalid channel or event" }, { status: 400 });
	}

	getRealtimeHub().emitClientBroadcast(channel, event, payload);
	return Response.json({ ok: true });
}
