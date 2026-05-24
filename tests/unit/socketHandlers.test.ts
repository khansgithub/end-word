import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import {
    broadcastGameState,
    fml,
} from "@/server/socketHandlers";
import { buildInitialGameState } from "@/shared/GameState";
import { socketEvents } from "@/shared/socketEvents";
import { GameState, ServerPlayerSocket } from "@/shared/types";
import { createRequiredPlayerWithId } from "@tests/unit/GameState.test-helpers";
import * as ServerGameState from "@/server/state";
import * as metrics from "@/server/metrics";

// =============================================================================
// MOCK FACTORIES
// =============================================================================

type MockSocket = {
    id: string;
    handshake: { auth: { clientId: string } };
    emit: Mock;
    broadcast: { emit: Mock };
    on: Mock;
    onAny: Mock;
    removeAllListeners: Mock;
};

function createMockSocket(
    clientId: string = "test-client-id",
    socketId: string = "socket-123"
): MockSocket {
    return {
        id: socketId,
        handshake: { auth: { clientId } },
        emit: vi.fn(),
        broadcast: { emit: vi.fn() },
        on: vi.fn(),
        onAny: vi.fn(),
        removeAllListeners: vi.fn(),
    };
}

function createMockContext() {
    return {
        state: buildInitialGameState(),
        runExclusive: vi.fn((fn: () => Promise<void>) => fn()),
        registeredSockets: new Map(),
        io: undefined,
        stats: { getPlayerCount: 0, connections: 0 },
    };
}

// =============================================================================
// broadcastGameState
// =============================================================================

describe("broadcastGameState", () => {
    let mockSocket: MockSocket;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSocket = createMockSocket("test-client");
    });

    it("should emit gameStateUpdate to socket.broadcast with game state", () => {
        const gameState = buildInitialGameState() as GameState;
        gameState.connectedPlayers = 2;
        gameState.status = "playing";

        broadcastGameState(mockSocket as unknown as ServerPlayerSocket, gameState);

        expect(mockSocket.broadcast.emit).toHaveBeenCalledTimes(1);
        expect(mockSocket.broadcast.emit).toHaveBeenCalledWith(
            "gameStateUpdate",
            expect.objectContaining({
                connectedPlayers: 2,
                status: "playing",
            })
        );
    });

    it("should not emit to the sender (uses broadcast)", () => {
        const gameState = buildInitialGameState() as GameState;

        broadcastGameState(mockSocket as unknown as ServerPlayerSocket, gameState);

        expect(mockSocket.emit).not.toHaveBeenCalled();
        expect(mockSocket.broadcast.emit).toHaveBeenCalled();
    });
});

// =============================================================================
// attachSocketHandlers (fml) - handler registration and behavior
// =============================================================================

describe("attachSocketHandlers", () => {
    let mockSocket: MockSocket;
    let mockGetGameState: Mock;
    let mockSetGameState: Mock;
    let mockCountSocketEvent: Mock;
    let mockSetRegisteredClients: Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSocket = createMockSocket("test-client");
        mockGetGameState = vi.fn();
        mockSetGameState = vi.fn();
        mockCountSocketEvent = vi.fn();
        mockSetRegisteredClients = vi.fn();

        vi.spyOn(ServerGameState, "getGameState").mockImplementation(
            mockGetGameState as any
        );
        vi.spyOn(ServerGameState, "setGameState").mockImplementation(
            mockSetGameState as any
        );
        vi.spyOn(metrics, "countSocketEvent").mockImplementation(
            mockCountSocketEvent
        );
        vi.spyOn(metrics, "setRegisteredClients").mockImplementation(
            mockSetRegisteredClients
        );
    });

    it("should count connect event on attach", () => {
        fml(mockSocket as unknown as ServerPlayerSocket, createMockContext() as any);

        expect(mockCountSocketEvent).toHaveBeenCalledWith("connect");
    });

    it("should register getPlayerCount handler", () => {
        const state = buildInitialGameState() as GameState;
        state.connectedPlayers = 3;
        mockGetGameState.mockReturnValue(state);

        fml(mockSocket as unknown as ServerPlayerSocket, createMockContext() as any);

        const getPlayerCountCall = mockSocket.on.mock.calls.find(
            (c: unknown[]) => c[0] === socketEvents.getPlayerCount
        );
        expect(getPlayerCountCall).toBeDefined();
        if (!getPlayerCountCall) return;

        const ack = vi.fn();
        getPlayerCountCall[1](ack);

        expect(mockCountSocketEvent).toHaveBeenCalledWith("getPlayerCount");
        expect(ack).toHaveBeenCalledWith(3);
    });

    it("should register isReturningPlayer handler - found", () => {
        const player = createRequiredPlayerWithId("Alice", "returning-client", 0);
        const state = buildInitialGameState() as GameState;
        state.players = [player, null, null, null];
        state.socketPlayerMap = new Map([["returning-client", 0]]);
        mockGetGameState.mockReturnValue(state);

        fml(mockSocket as unknown as ServerPlayerSocket, createMockContext() as any);

        const isReturningPlayerCall = mockSocket.on.mock.calls.find(
            (c: unknown[]) => c[0] === socketEvents.isReturningPlayer
        );
        expect(isReturningPlayerCall).toBeDefined();
        if (!isReturningPlayerCall) return;

        const ack = vi.fn();
        isReturningPlayerCall[1]("returning-client", ack);

        expect(ack).toHaveBeenCalledWith({
            found: true,
            player: expect.objectContaining({ name: "Alice", uid: "returning-client" }),
        });
    });

    it("should register isReturningPlayer handler - not found", () => {
        const state = buildInitialGameState() as GameState;
        mockGetGameState.mockReturnValue(state);

        fml(mockSocket as unknown as ServerPlayerSocket, createMockContext() as any);

        const isReturningPlayerCall = mockSocket.on.mock.calls.find(
            (c: unknown[]) => c[0] === socketEvents.isReturningPlayer
        );
        expect(isReturningPlayerCall).toBeDefined();
        if (!isReturningPlayerCall) return;

        const ack = vi.fn();
        isReturningPlayerCall[1]("unknown-client", ack);

        expect(ack).toHaveBeenCalledWith({ found: false });
    });

    it("should register registerPlayer handler for new player", () => {
        const state = buildInitialGameState() as GameState;
        mockGetGameState.mockReturnValue(state);

        fml(mockSocket as unknown as ServerPlayerSocket, createMockContext() as any);

        const registerPlayerCall = mockSocket.on.mock.calls.find(
            (c: unknown[]) => c[0] === socketEvents.registerPlayer
        );
        expect(registerPlayerCall).toBeDefined();
        if (!registerPlayerCall) return;

        const ack = vi.fn();
        const player = { name: "Alice", uid: "test-client", lastWord: "" };
        registerPlayerCall[1](player, ack);

        expect(mockCountSocketEvent).toHaveBeenCalledWith("registerPlayer");
        expect(mockSetGameState).toHaveBeenCalled();
        expect(ack).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                player: expect.objectContaining({ name: "Alice" }),
            })
        );
    });

    it("should register disconnect handler", () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 0);
        const state = buildInitialGameState() as GameState;
        state.players = [player, null, null, null];
        state.socketPlayerMap = new Map([["test-client", 0]]);
        state.connectedPlayers = 1;
        mockGetGameState.mockReturnValue(state);

        fml(mockSocket as unknown as ServerPlayerSocket, createMockContext() as any);

        const disconnectCall = mockSocket.on.mock.calls.find(
            (c: unknown[]) => c[0] === socketEvents.disconnect
        );
        expect(disconnectCall).toBeDefined();
        if (!disconnectCall) return;

        disconnectCall[1]("client disconnect");

        expect(mockCountSocketEvent).toHaveBeenCalledWith("disconnect");
        expect(mockSetGameState).toHaveBeenCalled();
    });

    it("should register submitWord handler", () => {
        fml(mockSocket as unknown as ServerPlayerSocket, createMockContext() as any);

        const submitWordCall = mockSocket.on.mock.calls.find(
            (c: unknown[]) => c[0] === socketEvents.submitWord
        );
        expect(submitWordCall).toBeDefined();
    });

    it("should register onAny handler for logging", () => {
        fml(mockSocket as unknown as ServerPlayerSocket, createMockContext() as any);

        expect(mockSocket.onAny).toHaveBeenCalledWith(expect.any(Function));
    });
});
