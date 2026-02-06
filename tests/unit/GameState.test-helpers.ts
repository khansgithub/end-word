import { DEFAULT_HEALTH } from "@/shared/consts";
import { buildInitialGameState, makePlayersArray } from "@/shared/GameState";
import { ClientPlayers, GameState, Player, PlayerWithId } from "@/shared/types";

// =============================================================================
// TEST HELPERS
// =============================================================================

export function createTestPlayer(name: string, uid?: string, seat?: number): Player {
    return {
        name,
        lastWord: "",
        health: DEFAULT_HEALTH,
        ...(uid && { uid }),
        ...(seat !== undefined && { seat }),
    };
}

export function createTestPlayerWithId(name: string, uid: string, seat?: number): PlayerWithId {
    return {
        name,
        uid,
        lastWord: "",
        health: DEFAULT_HEALTH,
        ...(seat !== undefined && { seat }),
    };
}

export function createRequiredPlayerWithId(name: string, uid: string, seat: number): Required<PlayerWithId> {
    return {
        name,
        uid,
        lastWord: "",
        seat,
        health: DEFAULT_HEALTH,
    };
}

export function createTestGameState(overrides?: Partial<GameState>): GameState {
    const baseState = buildInitialGameState();
    return {
        ...baseState,
        ...overrides,
    };
}

export function createGameStateWithPlayers(players: (Player | null)[]): GameState {
    const state = buildInitialGameState();
    const playersArray = makePlayersArray<ClientPlayers>();
    players.forEach((player, index) => {
        if (player) {
            playersArray[index] = player;
        }
    });
    return {
        ...state,
        players: playersArray,
        connectedPlayers: players.filter(player => player !== null).length,
    };
}
