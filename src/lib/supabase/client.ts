"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createMockBrowserClient } from "@/app/server/supabase/mock/createClient";

export function createClient() {
  if (process.env.NEXT_PUBLIC_MOCK_SUPABASE === "true") {
    return createMockBrowserClient() as ReturnType<typeof createBrowserClient>;
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
