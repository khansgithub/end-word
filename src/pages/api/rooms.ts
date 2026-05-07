import type { NextApiRequest, NextApiResponse } from 'next'

import { createClient } from "@supabase/supabase-js";
import { GetRoomsResp, RoomSummary } from '../../shared/supabaseTypes';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

async function getRoomCount(): Promise<{status: number, json: Record<string, any>}>{
    const rooms: RoomSummary[] = [];
    try {
        console.log(`[rooms API] Querying Supabase for count of rooms...`);
        const result = await supabase.from('rooms').select('players, roomName');
   
        result.data?.forEach(({roomName, players}: { roomName: string, players: number }) => {
            rooms.push([roomName, players]);
        });
        console.log(`[rooms API] Supabase response:`, result);
        console.log(`[rooms API] Responded with count: ${result.count}`);

        const res: GetRoomsResp = {
            rooms: rooms
        };
        return {
            status: 200,
            json: res
        }
    } catch (error: any) {
        console.error(`[rooms API] Error querying Supabase:`, error);
        return {
            status: 500,
            json: {
                error: error.message
            }
        }
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log(`[rooms API] Incoming ${req.method} request at ${new Date().toISOString()}`);
    if (req.method == 'GET') {
        const {status, json} = await getRoomCount();
        res.status(status).json(json);
    } else {
        console.log(`[rooms API] GET method not supported by this endpoint. Returning 405.`);
        res.status(405).json({ error: 'GET method not supported on this endpoint.' });
        return;
    }
}