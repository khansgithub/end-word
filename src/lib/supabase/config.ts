import { envGet } from "@/server/env";

export function isMockSupabase(): boolean {
  return envGet("MOCK_SUPABASE") === "true";
}
