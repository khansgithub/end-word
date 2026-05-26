import type { SupabaseClient } from "@supabase/supabase-js";
import { from } from "@/app/server/supabase/mock/queryBuilder";
import {
  createMockAuthApi,
  readUserIdFromCookieString,
  readUserIdFromDocumentCookie,
  setBrowserAuthCookie,
  MOCK_AUTH_COOKIE,
} from "@/app/server/supabase/mock/auth";
import { MockRealtimeChannel } from "@/app/server/supabase/mock/channel";

type CookieStore = {
  getAll: () => { name: string; value: string }[];
  set?: (name: string, value: string) => void;
};

function browserUserId(): string | null {
  return readUserIdFromDocumentCookie();
}

function serverUserId(cookieStore?: CookieStore): string | null {
  if (cookieStore) {
    const hit = cookieStore.getAll().find((c) => c.name === MOCK_AUTH_COOKIE);
    if (hit?.value) return decodeURIComponent(hit.value);
  }
  return null;
}

function buildMockClient(getUserId: () => string | null, setUserId: (id: string) => void) {
  const auth = createMockAuthApi(getUserId, setUserId);
  const channels = new Map<string, MockRealtimeChannel>();

  return {
    auth,
    from,
    channel(name: string, config?: { presence?: { key?: string } }) {
      const ch = new MockRealtimeChannel(name, config);
      channels.set(name, ch);
      return ch;
    },
    removeChannel(channel: MockRealtimeChannel) {
      channels.delete(
        [...channels.entries()].find(([, ch]) => ch === channel)?.[0] ?? ""
      );
    },
  };
}

export function createMockBrowserClient(): SupabaseClient {
  return buildMockClient(
    browserUserId,
    (id) => setBrowserAuthCookie(id)
  ) as unknown as SupabaseClient;
}

export function createMockServerClient(cookieStore?: CookieStore): SupabaseClient {
  return buildMockClient(
    () => serverUserId(cookieStore),
    (id) => cookieStore?.set?.(MOCK_AUTH_COOKIE, id)
  ) as unknown as SupabaseClient;
}

export function createMockAdminClient(): SupabaseClient {
  return {
    auth: createMockAuthApi(
      () => null,
      () => {}
    ),
    from,
    channel: () => {
      throw new Error("Admin mock client does not support realtime channels");
    },
    removeChannel: () => {},
  } as unknown as SupabaseClient;
}

export function readMockUserIdFromRequest(request: Request): string | null {
  return readUserIdFromCookieString(request.headers.get("cookie"));
}
