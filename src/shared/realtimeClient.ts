import type { Dispatch, SetStateAction } from "react";
import { GameState, GameStateDispatch } from "./GameState";
import { SocketEventName, socketEvents } from "./socketEvents";
import { pp } from "./utils";
import { ClientPlayerSocket, AckSubmitWordResponseParams, AckRegisterPlayerResponse, ServerToClientEvents } from "./socketTypes";
import { PlayerWithId, Player } from "./types";
import { getSupabaseClient } from "../app/lib/supabase";
const L = "socketClient: "
const log = console.log;
// const pp = isSuppress() ? () => { return "[SUPPRESS=TRUE]"; } : prettyprint;

// Used to ensure we only attach a single handler set per client socket.
const clientSocketsWithHandlers = new WeakSet<ClientPlayerSocket>();
const clientSocketEventHandlers = new Map<SocketEventName, unknown>();

export function onSocketEvent<T extends keyof ServerToClientEvents>(
    socket: ClientPlayerSocket,
    event: T,
    callback: ServerToClientEvents[T]
) {
    if (clientSocketEventHandlers.has(event)) {
        return;
    }
    clientSocketEventHandlers.set(event, callback);
    socket.on(event, callback as any);
}