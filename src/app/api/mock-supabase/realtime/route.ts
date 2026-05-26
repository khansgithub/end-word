import { isMockSupabase } from "@/app/server/supabase/config";
import { getRealtimeHub } from "@/app/server/supabase/mock/realtimeHub";
import { readMockUserIdFromRequest } from "@/app/server/supabase/mock/createClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isMockSupabase()) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  if (!channel) {
    return new Response("channel required", { status: 400 });
  }

  void readMockUserIdFromRequest(request);

  const presenceKey = url.searchParams.get("presenceKey");
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      unsubscribe = getRealtimeHub().subscribeSse(channel, send);
    },
    cancel() {
      if (presenceKey) {
        getRealtimeHub().untrack(channel, presenceKey);
      }
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
