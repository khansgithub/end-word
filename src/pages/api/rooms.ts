import type { NextApiRequest, NextApiResponse } from 'next'

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        try {
            const result = await supabase.from('rooms').select("id", { count: 'exact' });
            res.status(200).json({ count: result.count });
            return;
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: error.message });
            return;
        }
    }
}