import { describe, expect, it } from "vitest";
import {
    buildInitialGameState,
    clonePlayersArray,
    isRequiredGameState,
    makePlayersArray,
} from "../../src/shared/GameState";
import { MAX_PLAYERS } from "../../src/shared/consts";
import { ClientPlayers, ServerPlayers } from "../../src/shared/types";
import {
    createGameStateWithPlayers,
    createRequiredPlayerWithId,
    createTestGameState,
    createTestPlayer,
} from "./GameState.test-helpers";

// =============================================================================
// UTILITY FUNCTIONS TESTS
// =============================================================================

describe("makePlayersArray", () => {
    it("should create an array of MAX_PLAYERS length", () => {
        const array = makePlayersArray<ClientPlayers>();
        expect(array).toHaveLength(MAX_PLAYERS);
    });

    it("should create an array filled with null values", () => {
        const array = makePlayersArray<ClientPlayers>();
        array.forEach((player) => {
            expect(player).toBeNull();
        });
    });

    it("should work with ServerPlayers type", () => {
        const array = makePlayersArray<ServerPlayers>();
        expect(array).toHaveLength(MAX_PLAYERS);
        array.forEach((player) => {
            expect(player).toBeNull();
        });
    });
});

describe("clonePlayersArray", () => {
    it("should create a new array with the same length", () => {
        const original = makePlayersArray<ClientPlayers>();
        const cloned = clonePlayersArray(original);
        expect(cloned).toHaveLength(MAX_PLAYERS);
        expect(cloned).not.toBe(original);
    });

    it("should clone players correctly", () => {
        const original = makePlayersArray<ClientPlayers>();
        const player = createTestPlayer("Alice", "uid1", 0);
        original[0] = player;
        const cloned = clonePlayersArray(original);
        expect(cloned[0]).toEqual(player);
        expect(cloned[0]).not.toBe(player); // Different object reference
    });

    it("should preserve null values", () => {
        const original = makePlayersArray<ClientPlayers>();
        original[0] = createTestPlayer("Alice", "uid1", 0);
        const cloned = clonePlayersArray(original);
        expect(cloned[0]).not.toBeNull();
        expect(cloned[1]).toBeNull();
    });

    it("should not mutate the original array", () => {
        const original = makePlayersArray<ClientPlayers>();
        const player = createTestPlayer("Alice", "uid1", 0);
        original[0] = player;
        const cloned = clonePlayersArray(original);
        cloned[1] = createTestPlayer("Bob", "uid2", 1);
        expect(original[1]).toBeNull();
    });
});

describe("buildInitialGameState", () => {
    it("should create a game state with default values", () => {
        const state = buildInitialGameState();
        expect(state.status).toBeNull();
        expect(state.turn).toBe(0);
        expect(state.connectedPlayers).toBe(0);
        expect(state.players).toHaveLength(MAX_PLAYERS);
        expect(state.matchLetter).toBeDefined();
        expect(state.matchLetter.block).toBe("가");
    });

    it("should create server game state when server option is true", () => {
        const state = buildInitialGameState({ server: true });
        expect(state.players).toHaveLength(MAX_PLAYERS);
        expect(state.thisPlayer).toBeUndefined();
    });

    it("should create client game state when server option is false or undefined", () => {
        const clientState1 = buildInitialGameState({ server: false });
        const clientState2 = buildInitialGameState();
        expect(clientState1.players).toHaveLength(MAX_PLAYERS);
        expect(clientState2.players).toHaveLength(MAX_PLAYERS);
    });
});

describe("isRequiredGameState", () => {
    it("should return true when thisPlayer is defined", () => {
        const state = createTestGameState();
        const player = createRequiredPlayerWithId("Alice", "uid1", 0);
        const stateWithPlayer = { ...state, thisPlayer: player };
        expect(isRequiredGameState(stateWithPlayer)).toBe(true);
    });

    it("should return false when thisPlayer is undefined", () => {
        const state = createTestGameState();
        expect(isRequiredGameState(state)).toBe(false);
    });

    it("should return false when thisPlayer is missing", () => {
        const state = createTestGameState();
        delete (state as any).thisPlayer;
        expect(isRequiredGameState(state)).toBe(false);
    });
});
