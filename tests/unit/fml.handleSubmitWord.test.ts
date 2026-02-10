import { DEFAULT_HEALTH } from "@/shared/consts";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { handleSubmitWord } from "../../src/server/fml";
import * as serverGameState from "../../src/server/serverGameState";
import * as GameState from "../../src/shared/GameState";
import { buildInitialGameState } from "../../src/shared/GameState";
import { AckSubmitWordResponse, GameState as GameStateType, PlayerWithId, ServerPlayerSocket } from "../../src/shared/types";
import * as utils from "../../src/shared/utils";
import { pp } from "../../src/shared/utils";
import { createRequiredPlayerWithId } from "./GameState.test-helpers";

// =============================================================================
// MOCK FACTORIES
// =============================================================================

type MockSocket = {
    id: string;
    handshake: { auth: { clientId: string } };
    emit: Mock;
    broadcast: { emit: Mock };
};

function createMockSocket(clientId: string = "test-client-id", socketId: string = "socket-123"): MockSocket {
    return {
        id: socketId,
        handshake: { auth: { clientId } },
        emit: vi.fn(),
        broadcast: { emit: vi.fn() },
    };
}

function createMockAck(): AckSubmitWordResponse {
    return vi.fn();
}

function createTestGameStateWithMatchLetter(matchLetter: string): GameStateType {
    const state = buildInitialGameState();
    const testPlayer = createRequiredPlayerWithId("TestPlayer", "test-client-id", 0);
    const testPlayer2 = createRequiredPlayerWithId("TestPlayer2", "test-client-id2", 1);
    
    return {
        ...state,
        matchLetter: {
            block: matchLetter,
            steps: [],
            value: matchLetter,
            next: 0,
        },
        players: [testPlayer, testPlayer2, null, null, null],
        connectedPlayers: 2,
        status: "playing",
        thisPlayer: testPlayer, // Required for invalidWord to work
        socketPlayerMap: new Map([["test-client-id", testPlayer], ["test-client-id2", testPlayer2]]),
    };
}

// =============================================================================
// TESTS
// =============================================================================

describe("handleSubmitWord - validation logic", () => {
    let mockSocket: MockSocket;
    let mockAck: ReturnType<typeof createMockAck>;
    let mockGetGameState: Mock;
    let mockSetGameState: Mock;
    let mockInputIsValid: Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockSocket = createMockSocket("test-client-id");
        mockAck = createMockAck();

        // Mock getGameState and setGameState
        mockGetGameState = vi.fn();
        mockSetGameState = vi.fn();
        
        vi.spyOn(serverGameState, "getGameState").mockImplementation(mockGetGameState as any);
        vi.spyOn(serverGameState, "setGameState").mockImplementation(mockSetGameState as any);

        // Mock inputIsValid
        mockInputIsValid = vi.fn();
        vi.spyOn(utils, "inputIsValid").mockImplementation(mockInputIsValid);
    });

    describe("correct player health is decreased", () => {
        it("should decrease the health of the correct player", async () => {
            const mockDecreasePlayerHealth = vi.fn(GameState.decreasePlayerHealth);
            const state = createTestGameStateWithMatchLetter("가");
            const testPlayer = state.players[1]!;
            const word = "가나다";

            state.turn = 1;
            state.thisPlayer = testPlayer as PlayerWithId;

            vi.spyOn(GameState, "decreasePlayerHealth").mockImplementation(mockDecreasePlayerHealth as any);

            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(false);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                word,
                mockAck
            );

            expect(mockInputIsValid).toHaveBeenCalledOnce();
            expect(mockDecreasePlayerHealth).toHaveBeenCalledOnce();

            const outputState = mockDecreasePlayerHealth.mock.results[0].value as GameStateType;
            console.log("outputState: ", pp(outputState));
            expect(outputState.players[1]!.health).toBe(DEFAULT_HEALTH - 1);
            expect(outputState.thisPlayer!.health).toBe(DEFAULT_HEALTH - 1);
        });
    });

    describe("word length and match letter validation", () => {
        it("should reject empty word", async () => {
            const state = createTestGameStateWithMatchLetter("가");
            mockGetGameState.mockReturnValue(state);

            const emptyWord = "";
            
            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                emptyWord,
                mockAck
            );

            // Should call ack with failure
            expect(mockAck).toHaveBeenCalledWith({
                success: false,
                reason: expect.stringContaining("word doesn't match"),
            });
            expect(mockAck).toHaveBeenCalledWith({
                success: false,
                reason: expect.stringContaining("Expected starting with: 가"),
            });
            
            // Should NOT proceed to validate word
            expect(mockInputIsValid).not.toHaveBeenCalled();
        });

        it("should reject word that doesn't start with match letter", async () => {
            const startingLetter = "가";
            const notMatchLetterWord = "나무";

            const state = createTestGameStateWithMatchLetter(startingLetter);
            mockGetGameState.mockReturnValue(state);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                notMatchLetterWord,
                mockAck
            );

            // Should call ack with failure and correct reason
            expect(mockAck).toHaveBeenCalledWith({
                success: false,
                reason: expect.stringContaining(`Expected starting with: ${startingLetter}`),
            });
            expect(mockAck).toHaveBeenCalledWith({
                success: false,
                reason: expect.stringContaining(`got: ${notMatchLetterWord}`),
            });
            
            // Should NOT proceed to validate word
            expect(mockInputIsValid).not.toHaveBeenCalled();
        });

        it("should proceed to word validation when word starts with match letter", async () => {
            const startingLetter = "가";
            const matchingWord = "가나다";
            const state = createTestGameStateWithMatchLetter(startingLetter);
            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(false); // dont run the validation function because it requires the dictionary api.

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                matchingWord,
                mockAck
            );

            // Should proceed to validate word (passes first check)
            expect(mockInputIsValid).toHaveBeenCalledWith(matchingWord);
        });
    });

    describe("word validity validation", () => {
        it("should reject word that is invalid (inputIsValid returns false)", async () => {
            const startingLetter = "가";
            const invalidWord = "가나다";
            const state = createTestGameStateWithMatchLetter(startingLetter);
            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(false);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                invalidWord,
                mockAck
            );

            // Should call inputIsValid
            expect(mockInputIsValid).toHaveBeenCalledWith(invalidWord);
            
            // Should call ack with failure
            expect(mockAck).toHaveBeenCalledWith({
                success: false,
                reason: expect.stringContaining(`word (${invalidWord}) is not valid`),
            });
        });

        it("should accept word that is valid (inputIsValid returns true)", async () => {
            const startingLetter = "가";
            const validWord = "가나다";
            const state = createTestGameStateWithMatchLetter(startingLetter);
            const testPlayer = createRequiredPlayerWithId("TestPlayer", "test-client-id", 0);
            state.thisPlayer = testPlayer;
            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(true);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                validWord,
                mockAck
            );

            // Should call inputIsValid
            expect(mockInputIsValid).toHaveBeenCalledWith(validWord);
            
            // Should proceed to update state (setGameState should be called)
            expect(mockSetGameState).toHaveBeenCalled();
            
            // Should call ack with success
            expect(mockAck).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                })
            );
        });
    });

    describe("edge cases", () => {
        it("should handle different match letters correctly", async () => {
            const startingLetter = "나";
            const word = "가나다";
            const state = createTestGameStateWithMatchLetter(startingLetter);
            mockGetGameState.mockReturnValue(state);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                word,
                mockAck
            );

            expect(mockAck).toHaveBeenCalledWith({
                success: false,
                reason: expect.stringContaining(`Expected starting with: ${startingLetter}`),
            });
            expect(mockInputIsValid).not.toHaveBeenCalled();
        });

        it("should handle single character words", async () => {
            const startingLetter = "가";
            const singleCharacterWord = "가";
            const state = createTestGameStateWithMatchLetter(startingLetter);
            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(false); // Fail validation to stop early

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                singleCharacterWord,
                mockAck
            );

            // Should pass first validation (starts with '가') and proceed to validate
            expect(mockInputIsValid).toHaveBeenCalledWith(singleCharacterWord);
        });

        it("should handle words with same first and last character", async () => {
            const startingLetter = "가";
            const word = "가가";
            const state = createTestGameStateWithMatchLetter(startingLetter);
            const testPlayer = createRequiredPlayerWithId("TestPlayer", "test-client-id", 0);
            state.thisPlayer = testPlayer;
            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(true);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                word,
                mockAck
            );

            // Should pass both validations
            expect(mockInputIsValid).toHaveBeenCalledWith(word);
            expect(mockAck).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                })
            );
        });
    });
});

