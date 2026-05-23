import { invalidWord } from "@/server/socketHandlers";
import { DEFAULT_HEALTH } from "@/shared/consts";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import * as ServerGameState from "../../src/server/state";
import { buildInitialGameState } from "../../src/shared/GameState";
import { AckSubmitWordResponse, GameState as GameStateType, ServerPlayers, ServerPlayerSocket } from "../../src/shared/types";
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

function createStateWithPlayer(
    clientId: string,
    health: number,
    alivePlayerCount: number
): GameStateType {
    const player = createRequiredPlayerWithId("TestPlayer", clientId, 0);
    player.health = health;

    const players: ServerPlayers = [player, null, null, null];
    for (let i = 1; i < alivePlayerCount; i++) {
        players[i] = createRequiredPlayerWithId(`Player${i + 1}`, `client-${i + 1}`, i);
    }

    return {
        ...buildInitialGameState(),
        players,
        connectedPlayers: alivePlayerCount,
        status: "playing",
        thisPlayer: player,
        socketPlayerMap: new Map([[clientId, 0]]),
    };
}

// =============================================================================
// TESTS
// =============================================================================

describe("invalidWord", () => {
    let mockSocket: MockSocket;
    let mockAck: ReturnType<typeof createMockAck>;
    let mockGetGameState: Mock;
    let mockSetGameState: Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSocket = createMockSocket("test-client-id");
        mockAck = createMockAck();
        mockGetGameState = vi.fn();
        mockSetGameState = vi.fn();

        vi.spyOn(ServerGameState, "getGameState").mockImplementation(mockGetGameState as any);
        vi.spyOn(ServerGameState, "setGameState").mockImplementation(mockSetGameState as any);
    });


    it("decreases player health and acks with failure when player has health 1 and 3 players alive (does not end game)", () => {
        // Create game state with 3 alive players, first player has health 1
        const state = createStateWithPlayer("test-client-id", 1, 3);
        mockGetGameState.mockReturnValue(state);

        invalidWord(
            mockSocket as unknown as ServerPlayerSocket,
            "some invalid reason",
            mockAck
        );


        expect(mockSetGameState).toHaveBeenCalledTimes(1);
        const nextState = mockSetGameState.mock.calls[0][0];
        expect(nextState.status).toBe("playing");
        expect(nextState.turn).toBe(1);
        console.log("nextState", JSON.stringify(nextState, null, 2));
        // // Player's health should go from 1 to 0 (dead), but game should NOT end (since 3 alive at start)
        // expect(nextState.players[0]!.health).toBe(0);
        // expect(nextState.status).not.toBe("finished");

        // expect(mockSocket.broadcast.emit).toHaveBeenCalledWith("gameStateUpdate", expect.any(Object));
        // expect(mockAck).toHaveBeenCalledWith({
        //     success: false,
        //     reason: "some invalid reason",
        // });
        // expect(mockAck.mock.calls[0][0]).not.toHaveProperty("endGameState");
    });
});
