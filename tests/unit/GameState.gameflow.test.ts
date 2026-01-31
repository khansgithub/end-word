import { describe, expect, it } from "vitest";
import { gameStateReducer } from "../../src/shared/GameState";
import { GameState } from "../../src/shared/types";
import {
    createGameStateWithPlayers,
    createTestGameState,
    createTestPlayer,
} from "./GameState.test-helpers";

// =============================================================================
// GAME FLOW FUNCTIONS TESTS
// =============================================================================

describe("setPlayerLastWord", () => {
    it("should set lastWord for the current turn player", () => {
        const state = createGameStateWithPlayers([
            createTestPlayer("Alice", "uid1", 0),
            createTestPlayer("Bob", "uid2", 1),
            null,
            null,
            null,
        ]);
        const action = {
            type: "setPlayerLastWord" as const,
            payload: [state, "apple"] as [GameState, string],
        };
        const result = gameStateReducer(state, action);
        expect(result.players[0]?.lastWord).toBe("apple");
    });

    it("should update lastWord for the correct turn", () => {
        const state = createGameStateWithPlayers([
            createTestPlayer("Alice", "uid1", 0),
            createTestPlayer("Bob", "uid2", 1),
            null,
            null,
            null,
        ]);
        const stateWithTurn = { ...state, turn: 1 };
        const action = {
            type: "setPlayerLastWord" as const,
            payload: [stateWithTurn, "banana"] as [GameState, string],
        };
        const result = gameStateReducer(stateWithTurn, action);
        expect(result.players[1]?.lastWord).toBe("banana");
        expect(result.players[0]?.lastWord).toBe("");
    });

    it("should throw error when player at turn index is null", () => {
        const state = createTestGameState({ turn: 2 });
        const action = {
            type: "setPlayerLastWord" as const,
            payload: [state, "word"] as [GameState, string],
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
        const action = {
            type: "setPlayerLastWord" as const,
            payload: [state, "word"] as [GameState, string],
        };
        gameStateReducer(state, action);
        expect(state.players[0]?.lastWord).toBe("");
    });
});

describe("progressNextTurn", () => {
    it("should build match letter, set last word, and increment turn", () => {
        const state = createGameStateWithPlayers([
            createTestPlayer("Alice", "uid1", 0),
            createTestPlayer("Bob", "uid2", 1),
            null,
            null,
            null,
        ]);
        const action = {
            type: "progressNextTurn" as const,
            payload: [state, "가", "apple"] as [GameState, string, string],
        };
        const result = gameStateReducer(state, action);
        expect(result.matchLetter.block).toBe("가");
        expect(result.players[0]?.lastWord).toBe("apple");
        expect(result.turn).toBe(1);
    });

    it("should chain all three operations correctly", () => {
        const state = createGameStateWithPlayers([
            createTestPlayer("Alice", "uid1", 0),
            createTestPlayer("Bob", "uid2", 1),
            createTestPlayer("Charlie", "uid3", 2),
            null,
            null,
        ]);
        const initialState = { ...state, turn: 2 };
        const action = {
            type: "progressNextTurn" as const,
            payload: [initialState, "나", "banana"] as [GameState, string, string],
        };
        const result = gameStateReducer(initialState, action);
        expect(result.matchLetter.block).toBe("나");
        expect(result.players[2]?.lastWord).toBe("banana");
        expect(result.turn).toBe(3);
    });
});

describe("gameStateReducer", () => {
    it("should throw error for unknown action type", () => {
        const state = createTestGameState();
        const invalidAction = {
            type: "unknownAction" as any,
            payload: [] as any,
        };
        expect(() => gameStateReducer(state, invalidAction)).toThrow(
            "couldn't find unknownAction in GameStateActions"
        );
    });

    it("should handle all valid action types", () => {
        const state = createTestGameState();
        const validActions = [
            "nextTurn",
            "setPlayerLastWord",
            "registerPlayer",
            "addPlayer",
            "addPlayerToArray",
            "removePlayer",
            "progressNextTurn",
            "updateConnectedPlayersCount",
            "replaceGameState",
            "gameStateUpdateClient",
        ];

        validActions.forEach((actionType) => {
            const action = {
                type: actionType as any,
                payload: [] as any,
            };
            // We expect some to throw due to invalid payloads, but the action type should be recognized
            try {
                gameStateReducer(state, action);
            } catch (error: any) {
                // Should not throw "couldn't find" error
                expect(error.message).not.toContain("couldn't find");
            }
        });
    });

    it("should return a new state object", () => {
        const state = createTestGameState();
        const action = {
            type: "nextTurn" as const,
            payload: [state] as [GameState],
        };
        const result = gameStateReducer(state, action);
        expect(result).not.toBe(state);
    });
});
