import { envGet } from "@/app/server/env";

export function isMockSupabase(): boolean {
  return envGet("MOCK_SUPABASE") === "true" || envGet("NEXT_PUBLIC_MOCK_SUPABASE") === "true";
}
