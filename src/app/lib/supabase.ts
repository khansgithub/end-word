import { createClient, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseClient(): SupabaseClient {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
	return createClient(supabaseUrl, supabaseKey);
}

export function getStatsChannel() : RealtimeChannel{
	const client = getSupabaseClient();
	const channel = client.channel("stats");
	return channel;
}