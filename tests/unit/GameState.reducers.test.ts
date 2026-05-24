import { describe, expect, it } from "vitest";
import { gameStateReducer } from "../../src/shared/GameState";
import { GameState, PlayerWithId } from "../../src/shared/types";
import {
    createGameStateWithPlayers,
    createTestGameState,
    createTestPlayer,
    createTestPlayerWithId,
} from "./GameState.test-helpers";

// =============================================================================
// REDUCER FUNCTIONS TESTS
// =============================================================================

describe("updateConnectedPlayersCount", () => {
    it("should update connectedPlayers count", () => {
        const state = createTestGameState();
        const action = {
            type: "updateConnectedPlayersCount" as const,
            payload: [state, 3] as [GameState, number],
        };
        const result = gameStateReducer(state, action);
        expect(result.connectedPlayers).toBe(3);
    });

    it("should not mutate the original state", () => {
        const state = createTestGameState();
        const originalCount = state.connectedPlayers;
        const action = {
            type: "updateConnectedPlayersCount" as const,
            payload: [state, 5] as [GameState, number],
        };
        gameStateReducer(state, action);
        expect(state.connectedPlayers).toBe(originalCount);
    });
});

describe("nextTurn", () => {
    it("should increment turn by 1", () => {
        const state = createTestGameState({ turn: 2 });
        const action = {
            type: "nextTurn" as const,
            payload: [state] as [GameState],
        };
        const result = gameStateReducer(state, action);
        expect(result.turn).toBe(3);
    });

    it("should increment from 0 to 1", () => {
        const state = createTestGameState({ turn: 0 });
        const action = {
            type: "nextTurn" as const,
            payload: [state] as [GameState],
        };
        const result = gameStateReducer(state, action);
        expect(result.turn).toBe(1);
    });

    it("should not mutate the original state", () => {
        const state = createTestGameState({ turn: 5 });
        const action = {
            type: "nextTurn" as const,
            payload: [state] as [GameState],
        };
        gameStateReducer(state, action);
        expect(state.turn).toBe(5);
    });
});

// Testing _postPlayerCountUpdateState indirectly through functions that use it
describe("_postPlayerCountUpdateState (via addPlayer)", () => {
    it("should set status to 'waiting' when less than 2 players", () => {
        const state = createTestGameState();
        const player = createTestPlayerWithId("Player0", "uid0");
        const action = {
            type: "addPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        expect(result.status).toBe("waiting");
        expect(result.connectedPlayers).toBe(1);
    });

    it("should keep status 'waiting' when 2 or more players join (host must start explicitly)", () => {
        const state = createGameStateWithPlayers([
            createTestPlayer("Player0", "uid0", 0),
            null,
            null,
            null,
            null,
        ]);
        const player = createTestPlayerWithId("Player1", "uid1");
        const action = {
            type: "addPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        expect(result.status).toBe("waiting");
        expect(result.connectedPlayers).toBe(2);
    });

    it("should correctly count connected players", () => {
        const state = createGameStateWithPlayers([
            createTestPlayer("Player0", "uid0", 0),
            createTestPlayer("Player1", "uid1", 1),
            null,
            createTestPlayer("Player2", "uid2", 3),
            null,
        ]);
        const player = createTestPlayerWithId("Player3", "uid3");
        const action = {
            type: "addPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        expect(result.connectedPlayers).toBe(4);
        expect(result.status).toBe("waiting");
    });
});
