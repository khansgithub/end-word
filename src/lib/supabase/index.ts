import { isMockSupabase } from "@/lib/supabase/config";
import {
  createMockAdminClient,
  createMockBrowserClient,
  createMockServerClient,
} from "@/lib/supabase/mock/createClient";
import { createRealAdminClient } from "@/lib/supabase/real/admin";
import { createRealBrowserClient } from "@/lib/supabase/real/browser";
import { createRealServerClient } from "@/lib/supabase/real/server";

export { isMockSupabase } from "@/lib/supabase/config";

/** Browser Supabase client (client components). */
export function createBrowserClient() {
  if (isMockSupabase()) return createMockBrowserClient();
  return createRealBrowserClient();
}

/** Server Supabase client with cookie session (API routes, RSC). */
export async function createServerClient() {
  if (isMockSupabase()) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return createMockServerClient({
      getAll: () => cookieStore.getAll(),
      set: (name, value) => {
        try {
          cookieStore.set(name, value);
        } catch {
          // read-only context
        }
      },
    });
  }
  return createRealServerClient();
}

/** Service-role admin client (room persistence). */
export function createAdminClient() {
  if (isMockSupabase()) return createMockAdminClient();
  return createRealAdminClient();
}

// Back-compat aliases used by existing imports
export const createClient = createBrowserClient;
