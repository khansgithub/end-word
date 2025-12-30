import { describe, expect, it } from "vitest";
import { gameStateReducer } from "../shared/GameState";
import { MAX_PLAYERS } from "../shared/consts";
import { GameState, Player, PlayerWithId } from "../shared/types";
import {
    createGameStateWithPlayers,
    createRequiredPlayerWithId,
    createTestGameState,
    createTestPlayer,
    createTestPlayerWithId,
} from "./GameState.test-helpers";

// =============================================================================
// PLAYER MANAGEMENT FUNCTIONS TESTS
// =============================================================================

describe("registerPlayer", () => {
    it("should set thisPlayer in the state", () => {
        const state = createTestGameState();
        const player = createTestPlayerWithId("Alice", "uid1", 0);
        const action = {
            type: "registerPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        expect(result.thisPlayer).toEqual(player);
    });

    it("should replace existing thisPlayer", () => {
        const existingPlayer = createRequiredPlayerWithId("Alice", "uid1", 0);
        const state = createTestGameState({ thisPlayer: existingPlayer });
        const newPlayer = createRequiredPlayerWithId("Bob", "uid2", 1);
        const action = {
            type: "registerPlayer" as const,
            payload: [state, newPlayer] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        expect(result.thisPlayer).toEqual(newPlayer);
        expect(result.thisPlayer?.uid).toBe("uid2");
    });

    it("should not mutate the original state", () => {
        const state = createTestGameState();
        const player = createTestPlayerWithId("Alice", "uid1", 0);
        const action = {
            type: "registerPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        gameStateReducer(state, action);
        expect(state.thisPlayer).toBeUndefined();
    });
});

describe("addPlayer", () => {
    it("should add a player to the first available seat", () => {
        const state = createTestGameState();
        const player = createTestPlayerWithId("Alice", "uid1");
        const action = {
            type: "addPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        expect(result.players[0]).toBeDefined();
        expect(result.players[0]?.name).toBe("Alice");
        expect(result.players[0]?.seat).toBe(0);
    });

    it("should add a player to the next available seat", () => {
        const state = createGameStateWithPlayers([
            createTestPlayer("Alice", "uid1", 0),
            null,
            null,
            null,
            null,
        ]);
        const player = createTestPlayerWithId("Bob", "uid2");
        const action = {
            type: "addPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        expect(result.players[1]).toBeDefined();
        expect(result.players[1]?.name).toBe("Bob");
        expect(result.players[1]?.seat).toBe(1);
    });

    it("should assign uid from thisPlayer if thisPlayer exists", () => {
        const thisPlayer = createRequiredPlayerWithId("Current", "current-uid", 0);
        const state = createTestGameState({ thisPlayer });
        const player = createTestPlayerWithId("Alice", "uid1");
        const action = {
            type: "addPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        const addedPlayer = result.players[0];
        expect(addedPlayer && "uid" in addedPlayer ? addedPlayer.uid : undefined).toBe("current-uid");
    });

    it("should not assign uid if thisPlayer does not exist", () => {
        const state = createTestGameState();
        const player = createTestPlayerWithId("Alice", "uid1");
        const action = {
            type: "addPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        // The player's original uid should be preserved
        const addedPlayer = result.players[0];
        expect(addedPlayer && "uid" in addedPlayer ? addedPlayer.uid : undefined).toBe("uid1");
    });

    it("should throw error when no seats are available", () => {
        const players = Array(MAX_PLAYERS)
            .fill(null)
            .map((_, i) => createTestPlayer(`Player${i}`, `uid${i}`, i));
        const state = createGameStateWithPlayers(players);
        const player = createTestPlayerWithId("NewPlayer", "new-uid");
        const action = {
            type: "addPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        expect(() => gameStateReducer(state, action)).toThrow("unexpected error");
    });

    it("should throw error when player name is missing", () => {
        const state = createTestGameState();
        const player = { ...createTestPlayerWithId("", "uid1"), name: "" };
        const action = {
            type: "addPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        expect(() => gameStateReducer(state, action)).toThrow("unexpected error");
    });
});

describe("removePlayer", () => {
    it("should remove a player from the specified seat", () => {
        const state = createGameStateWithPlayers([
            createTestPlayer("Alice", "uid1", 0),
            createTestPlayer("Bob", "uid2", 1),
            null,
            null,
            null,
        ]);
        const playerToRemove = createTestPlayer("Alice", "uid1", 0);
        const action = {
            type: "removePlayer" as const,
            payload: [state, playerToRemove] as [GameState, Player],
        };
        const result = gameStateReducer(state, action);
        expect(result.players[0]).toBeNull();
        expect(result.players[1]).not.toBeNull();
    });

    it("should update connectedPlayers count after removal", () => {
        const state = createGameStateWithPlayers([
            createTestPlayer("Alice", "uid1", 0),
            createTestPlayer("Bob", "uid2", 1),
            null,
            null,
            null,
        ]);
        const playerToRemove = createTestPlayer("Alice", "uid1", 0);
        const action = {
            type: "removePlayer" as const,
            payload: [state, playerToRemove] as [GameState, Player],
        };
        const result = gameStateReducer(state, action);
        expect(result.connectedPlayers).toBe(1);
        expect(result.status).toBe("waiting");
    });

    it("should throw error when player seat is undefined", () => {
        const state = createTestGameState();
        const playerWithoutSeat = createTestPlayer("Alice", "uid1");
        const action = {
            type: "removePlayer" as const,
            payload: [state, playerWithoutSeat] as [GameState, Player],
        };
        expect(() => gameStateReducer(state, action)).toThrow("unexpected error");
    });

    it("should not mutate the original state", () => {
        const state = createGameStateWithPlayers([
            createTestPlayer("Alice", "uid1", 0),
            null,
            null,
            null,
            null,
        ]);
        const playerToRemove = createTestPlayer("Alice", "uid1", 0);
        const action = {
            type: "removePlayer" as const,
            payload: [state, playerToRemove] as [GameState, Player],
        };
        gameStateReducer(state, action);
        expect(state.players[0]).not.toBeNull();
    });
});

describe("addPlayerToArray", () => {
    it("should add a player to the specified seat", () => {
        const state = createTestGameState();
        const player = createTestPlayer("Alice", "uid1", 2);
        const action = {
            type: "addPlayerToArray" as const,
            payload: [state, player] as [GameState, Player],
        };
        const result = gameStateReducer(state, action);
        expect(result.players[2]).toBeDefined();
        expect(result.players[2]?.name).toBe("Alice");
        expect(result.players[2]?.seat).toBe(2);
    });

    it("should update uid for thisPlayer if thisPlayer exists", () => {
        const thisPlayer = createRequiredPlayerWithId("Current", "current-uid", 1);
        const state = createTestGameState({ thisPlayer });
        const player = createTestPlayer("Alice", "uid1", 1);
        const action = {
            type: "addPlayerToArray" as const,
            payload: [state, player] as [GameState, Player],
        };
        const result = gameStateReducer(state, action);
        const updatedPlayer = result.players[1];
        expect(updatedPlayer && "uid" in updatedPlayer ? updatedPlayer.uid : undefined).toBe("current-uid");
    });

    it("should throw error when player seat is undefined", () => {
        const state = createTestGameState();
        const playerWithoutSeat = createTestPlayer("Alice", "uid1");
        const action = {
            type: "addPlayerToArray" as const,
            payload: [state, playerWithoutSeat] as [GameState, Player],
        };
        expect(() => gameStateReducer(state, action)).toThrow("must have a seat");
    });

    it("should update connectedPlayers count", () => {
        const state = createTestGameState();
        const player = createTestPlayer("Alice", "uid1", 0);
        const action = {
            type: "addPlayerToArray" as const,
            payload: [state, player] as [GameState, Player],
        };
        const result = gameStateReducer(state, action);
        expect(result.connectedPlayers).toBe(1);
    });
});

describe("addAndRegisterPlayer", () => {
    it("should add player and register as thisPlayer", () => {
        const state = createTestGameState();
        const player = createTestPlayerWithId("Alice", "uid1");
        const action = {
            type: "addAndRegisterPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        expect(result.players[0]).toBeDefined();
        expect(result.players[0]?.name).toBe("Alice");
        expect(result.thisPlayer).toEqual(player);
    });

    it("should assign seat to the player in the array", () => {
        const state = createTestGameState();
        const player = createTestPlayerWithId("Alice", "uid1");
        const action = {
            type: "addAndRegisterPlayer" as const,
            payload: [state, player] as [GameState, PlayerWithId],
        };
        const result = gameStateReducer(state, action);
        expect(result.players[0]?.seat).toBe(0);
        // thisPlayer is the original player object, which may not have a seat
        // The seat is assigned to the player in the array, not to thisPlayer
        expect(result.thisPlayer).toEqual(player);
    });
});

