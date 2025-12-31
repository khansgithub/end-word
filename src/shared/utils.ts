import { ClientPlayers, ClientPlayerSocket, PlayerWithId, PlayerWithoutId, ServerPlayers } from "./types";

export type RunExclusive = (fn: () => Promise<void>) => Promise<void>;

// Promise-based mutex to serialize state mutations across concurrent socket events.
export function createSocketMutex(): RunExclusive {
    let last = Promise.resolve();
    return fn => {
        last = last.then(fn);
        return last.catch(err => {
            // reset chain so later calls still run
            last = Promise.resolve();
            throw err;
        });
    };
}
export function pp(obj: any): string {
    return JSON.stringify(obj, null, '\t');
}

export function makeNewPlayer(name: string): PlayerWithoutId;
export function makeNewPlayer(name: string, uid: string): PlayerWithId;
export function makeNewPlayer(name: string, uid?: string): PlayerWithoutId | PlayerWithId {
    let r = { name, lastWord: "" };
    return uid === undefined ? r : { ...r, uid };
}


export function cloneServerPlayersToClientPlayers(players: ServerPlayers): ClientPlayers {
    const mapped = players.map((player) => {
        if (player == null) return null;
        const { uid: _uid, ...rest } = player;
        return rest;
    }) as ClientPlayers;

    return mapped;
}
