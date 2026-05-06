import type { Dispatch, SetStateAction } from "react";
import { GameState, GameStateDispatch } from "./GameState";
import { SocketEventName, socketEvents } from "./socketEvents";
import { pp } from "./utils";
import { ClientPlayerSocket, AckSubmitWordResponseParams, AckRegisterPlayerResponse, ServerToClientEvents } from "./socketTypes";
import { PlayerWithId, Player } from "./types";
import { getStatsChannel, getSupabaseClient } from "../app/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
const L = "socketClient: "
const log = console.log;
// const pp = isSuppress() ? () => { return "[SUPPRESS=TRUE]"; } : prettyprint;

// Used to ensure we only attach a single handler set per client socket.
const clientSocketsWithHandlers = new WeakSet<ClientPlayerSocket>();
const clientSocketEventHandlers = new Map<SocketEventName, unknown>();
const clientSocketEventSubscriptions = new Map<SocketEventName, RealtimeChannel>();
const statsChannel = getStatsChannel();

export function onSocketEvent<T extends keyof ServerToClientEvents>(
    socket: any,
    event: T,
    callback: ServerToClientEvents[T]
) {
    if (clientSocketEventSubscriptions.has(event)) {
        return;
    }
    const channel = statsChannel.on(
        "broadcast",
        { event: event },
        (payload: any) => callback(payload)
    );
    channel.subscribe(
        (state, err) => {
            if (!err) {
                console.log(`Subscribed to ${event} -> ${state}`)
                clientSocketEventSubscriptions.set(event, channel);
            }
            else console.error(`Error subscribing to ${event} -> ${err}`)
        }
    );
}

export function socketGetPlayerCount(setPlayerCount: (count: number) => void) {
    // const channel 
    // socket.emit(socketEvents.getPlayerCount, (count) => {
    //     log(L, "getPlayerCount: ", count);
    //     setPlayerCount(count);
    // });
}