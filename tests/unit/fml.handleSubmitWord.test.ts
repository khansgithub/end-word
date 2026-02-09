import { beforeEach, describe, expect, it, vi, Mock } from "vitest";
import { handleSubmitWord } from "../../src/server/fml";
import { ServerPlayerSocket, AckSubmitWordResponse, GameState } from "../../src/shared/types";
import { buildInitialGameState, progressNextTurn, toGameStateEmit } from "../../src/shared/GameState";
import { createRequiredPlayerWithId } from "./GameState.test-helpers";
import * as serverGameState from "../../src/server/serverGameState";
import * as utils from "../../src/shared/utils";

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

function createTestGameStateWithMatchLetter(matchLetter: string, player?: ReturnType<typeof createRequiredPlayerWithId>): GameState {
    const state = buildInitialGameState();
    const testPlayer = player || createRequiredPlayerWithId("TestPlayer", "test-client-id", 0);
    
    return {
        ...state,
        matchLetter: {
            block: matchLetter,
            steps: [],
            value: matchLetter,
            next: 0,
        },
        players: [testPlayer, null, null, null, null],
        connectedPlayers: 1,
        status: "playing",
        thisPlayer: testPlayer, // Required for invalidWord to work
        socketPlayerMap: new Map([["test-client-id", testPlayer]]),
    };
}

// =============================================================================
// TESTS
// =============================================================================

describe("handleSubmitWord - validation logic (lines 104-116)", () => {
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

    describe("word length and match letter validation (line 105)", () => {
        it("should reject empty word", async () => {
            const state = createTestGameStateWithMatchLetter("가");
            mockGetGameState.mockReturnValue(state);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                "",
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
            const state = createTestGameStateWithMatchLetter("가");
            mockGetGameState.mockReturnValue(state);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                "나무",
                mockAck
            );

            // Should call ack with failure and correct reason
            expect(mockAck).toHaveBeenCalledWith({
                success: false,
                reason: expect.stringContaining("Expected starting with: 가"),
            });
            expect(mockAck).toHaveBeenCalledWith({
                success: false,
                reason: expect.stringContaining("got: 나무"),
            });
            
            // Should NOT proceed to validate word
            expect(mockInputIsValid).not.toHaveBeenCalled();
        });

        it("should proceed to word validation when word starts with match letter", async () => {
            const state = createTestGameStateWithMatchLetter("가");
            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(false); // Make it fail validation to stop early

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                "가나다",
                mockAck
            );

            // Should proceed to validate word (passes first check)
            expect(mockInputIsValid).toHaveBeenCalledWith("가나다");
        });
    });

    describe("word validity validation (line 111)", () => {
        it("should reject word that is invalid (inputIsValid returns false)", async () => {
            const state = createTestGameStateWithMatchLetter("가");
            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(false);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                "가나다",
                mockAck
            );

            // Should call inputIsValid
            expect(mockInputIsValid).toHaveBeenCalledWith("가나다");
            
            // Should call ack with failure
            expect(mockAck).toHaveBeenCalledWith({
                success: false,
                reason: expect.stringContaining("word (가나다) is not valid"),
            });
        });

        it("should accept word that is valid (inputIsValid returns true)", async () => {
            const state = createTestGameStateWithMatchLetter("가");
            const testPlayer = createRequiredPlayerWithId("TestPlayer", "test-client-id", 0);
            state.thisPlayer = testPlayer;
            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(true);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                "가나다",
                mockAck
            );

            // Should call inputIsValid
            expect(mockInputIsValid).toHaveBeenCalledWith("가나다");
            
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
            const state = createTestGameStateWithMatchLetter("나");
            mockGetGameState.mockReturnValue(state);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                "가나다", // starts with '가', not '나'
                mockAck
            );

            expect(mockAck).toHaveBeenCalledWith({
                success: false,
                reason: expect.stringContaining("Expected starting with: 나"),
            });
            expect(mockInputIsValid).not.toHaveBeenCalled();
        });

        it("should handle single character words", async () => {
            const state = createTestGameStateWithMatchLetter("가");
            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(false); // Fail validation to stop early

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                "가",
                mockAck
            );

            // Should pass first validation (starts with '가') and proceed to validate
            expect(mockInputIsValid).toHaveBeenCalledWith("가");
        });

        it("should handle words with same first and last character", async () => {
            const state = createTestGameStateWithMatchLetter("가");
            const testPlayer = createRequiredPlayerWithId("TestPlayer", "test-client-id", 0);
            state.thisPlayer = testPlayer;
            mockGetGameState.mockReturnValue(state);
            mockInputIsValid.mockResolvedValue(true);

            await handleSubmitWord(
                mockSocket as unknown as ServerPlayerSocket,
                "가가",
                mockAck
            );

            // Should pass both validations
            expect(mockInputIsValid).toHaveBeenCalledWith("가가");
            expect(mockAck).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                })
            );
        });
    });
});

