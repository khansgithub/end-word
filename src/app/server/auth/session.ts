import { createClient } from "@/app/server/supabase/server";
import { createAdminClient } from "@/app/server/supabase/admin";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function ensureAnonymousUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw error ?? new Error("Anonymous sign-in failed");
  }
  return data.user;
}

export function getAdmin() {
  return createAdminClient();
}
