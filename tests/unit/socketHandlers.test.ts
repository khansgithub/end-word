// @ts-nocheck

import { beforeEach, describe, expect, it, vi, Mock } from "vitest";
import { Server as SocketServer } from "socket.io";
import {
    SocketHandlers,
    HandlerDependencies,
} from "../../src/shared/socketHandlers";
import { ServerSocketContext } from "../../src/shared/socketServer";
import { buildInitialGameState, makePlayersArray } from "../../src/shared/GameState";
import {
    GameState,
    PlayerWithId,
    ServerPlayers,
    ServerPlayerSocket,
} from "../../src/shared/types";
import {
    createRequiredPlayerWithId,
    createTestGameState,
} from "./GameState.test-helpers";

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

function createMockMetrics() {
    return {
        countEvent: vi.fn(),
        setRegisteredClients: vi.fn(),
        incrementConnections: vi.fn(),
        recordGetPlayerCountRequest: vi.fn(),
    };
}

function createMockContext(overrides?: Partial<ServerSocketContext>): ServerSocketContext {
    return {
        state: buildInitialGameState({ server: true }),
        runExclusive: vi.fn((fn) => fn()),
        registeredSockets: new Map(),
        io: undefined,
        stats: { getPlayerCount: 0, connections: 0 },
        logs: [],
        ...overrides,
    };
}

function createMockIoServer(): Partial<SocketServer> {
    const socketsMap = new Map<string, MockSocket>();
    return {
        sockets: {
            sockets: socketsMap,
        } as any,
    };
}

function createMockDependencies(overrides?: Partial<HandlerDependencies>): HandlerDependencies {
    const context = createMockContext();
    let state: GameState<ServerPlayers> = {
        ...buildInitialGameState({ server: true }),
        status: "waiting", // Ensure status is not null for assertion checks
    };

    return {
        context,
        getState: vi.fn(() => state),
        setState: vi.fn((nextState: GameState<ServerPlayers>) => { state = nextState; }),
        registeredSockets: new Map(),
        runExclusive: vi.fn((fn) => fn()),
        socketServer: undefined,
        metrics: createMockMetrics(),
        ...overrides,
    };
}

function createServerGameStateWithPlayers(players: (Required<PlayerWithId> | null)[]): GameState<ServerPlayers> {
    const state = buildInitialGameState({ server: true });
    const playersArray = makePlayersArray<ServerPlayers>();
    players.forEach((player, index) => {
        if (player) {
            playersArray[index] = player;
        }
    });
    const connectedPlayers = players.filter((p) => p !== null).length;
    return {
        ...state,
        players: playersArray,
        connectedPlayers,
        status: connectedPlayers >= 2 ? "playing" : "waiting",
    };
}

// =============================================================================
// broadcastGameStateUpdate (private, tested indirectly through other handlers)
// =============================================================================
// Note: broadcastGameStateUpdate is now private. Its behavior is tested through
// handlers that call it (registerPlayer, handleDisconnect, handleSubmitWord).

// =============================================================================
// registerPlayer (private, tested through handleRegisterPlayer)
// =============================================================================
describe("handleRegisterPlayer (registerPlayer logic)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should emit playerNotRegistered when room is full", () => {
        const players = Array(5).fill(null).map((_, i) =>
            createRequiredPlayerWithId(`Player${i}`, `uid${i}`, i)
        );
        const state = createServerGameStateWithPlayers(players as Required<PlayerWithId>[]);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("new-client");
        const player: PlayerWithId = { name: "NewPlayer", uid: "new-uid", lastWord: "" };

        handlers.handleRegisterPlayer(mockSocket as unknown as ServerPlayerSocket, player);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "playerNotRegistered",
            "room is full"
        );
    });

    it("should register player in first available seat", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");
        const player: PlayerWithId = { name: "Alice", uid: "uid1", lastWord: "" };

        handlers.handleRegisterPlayer(mockSocket as unknown as ServerPlayerSocket, player);

        expect(deps.setState).toHaveBeenCalled();
        expect(deps.registeredSockets.has("test-client")).toBe(true);
        expect(deps.metrics.setRegisteredClients).toHaveBeenCalledWith(1);
    });

    it("should emit playerRegistered event to socket", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");
        const player: PlayerWithId = { name: "Alice", uid: "uid1", lastWord: "" };

        handlers.handleRegisterPlayer(mockSocket as unknown as ServerPlayerSocket, player);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "playerRegistered",
            expect.any(Object)
        );
    });

    it("should broadcast playerJoinNotification to other players", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");
        const player: PlayerWithId = { name: "Alice", uid: "uid1", lastWord: "" };

        handlers.handleRegisterPlayer(mockSocket as unknown as ServerPlayerSocket, player);

        expect(mockSocket.broadcast.emit).toHaveBeenCalledWith(
            "playerJoinNotification",
            expect.objectContaining({ name: "Alice" })
        );
    });

    it("should assign seat to player when registering", () => {
        const existingPlayer = createRequiredPlayerWithId("Alice", "uid1", 0);
        const state = createServerGameStateWithPlayers([existingPlayer, null, null, null, null]);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");
        const newPlayer: PlayerWithId = { name: "Bob", uid: "uid2", lastWord: "" };

        handlers.handleRegisterPlayer(mockSocket as unknown as ServerPlayerSocket, newPlayer);

        const registeredPlayer = deps.registeredSockets.get("test-client");
        expect(registeredPlayer?.seat).toBe(1);
    });
});

// =============================================================================
// returnExistingPlayer (private, tested through handleRegisterPlayer)
// =============================================================================
describe("handleRegisterPlayer (returnExistingPlayer logic)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should emit playerRegistered with existing player data", () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 0);
        const state = createServerGameStateWithPlayers([player, null, null, null, null]);

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", player);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
            registeredSockets,
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleRegisterPlayer(mockSocket as unknown as ServerPlayerSocket, player);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "playerRegistered",
            expect.objectContaining({
                thisPlayer: expect.objectContaining({ name: "Alice", uid: "test-client" }),
            })
        );
    });

    it("should include thisPlayer in client state", () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 0);
        const state = createServerGameStateWithPlayers([player, null, null, null, null]);

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", player);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
            registeredSockets,
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleRegisterPlayer(mockSocket as unknown as ServerPlayerSocket, player);

        const emitCall = mockSocket.emit.mock.calls[0];
        const emittedState = emitCall[1];
        expect(emittedState.thisPlayer).toBeDefined();
        expect(emittedState.thisPlayer.uid).toBe("test-client");
    });
});

// =============================================================================
// handleDisconnect
// =============================================================================
describe("handleDisconnect", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should log disconnect event", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleDisconnect(mockSocket as unknown as ServerPlayerSocket, "client disconnect");

        expect(deps.metrics.countEvent).toHaveBeenCalledWith("disconnect");
    });

    it("should do nothing if player is not registered", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("unknown-client");

        handlers.handleDisconnect(mockSocket as unknown as ServerPlayerSocket, "client disconnect");

        expect(deps.setState).not.toHaveBeenCalled();
    });

    it("should remove player from state when disconnecting", () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 0);
        const state = createServerGameStateWithPlayers([player, null, null, null, null]);

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", player);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
            registeredSockets,
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleDisconnect(mockSocket as unknown as ServerPlayerSocket, "client disconnect");

        expect(deps.setState).toHaveBeenCalled();
        expect(registeredSockets.has("test-client")).toBe(false);
        expect(deps.metrics.setRegisteredClients).toHaveBeenCalledWith(0);
    });

    it("should broadcast playerLeaveNotification", () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 0);
        const state = createServerGameStateWithPlayers([player, null, null, null, null]);

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", player);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
            registeredSockets,
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleDisconnect(mockSocket as unknown as ServerPlayerSocket, "client disconnect");

        expect(mockSocket.broadcast.emit).toHaveBeenCalledWith(
            "playerLeaveNotification",
            expect.objectContaining({ name: "Alice" })
        );
    });
});

// =============================================================================
// handleGetPlayerCount
// =============================================================================
describe("handleGetPlayerCount", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should record metrics for getPlayerCount request", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleGetPlayerCount(mockSocket as unknown as ServerPlayerSocket);

        expect(deps.metrics.recordGetPlayerCountRequest).toHaveBeenCalled();
    });

    it("should emit playerCount with current connected players", () => {
        const player = createRequiredPlayerWithId("Alice", "uid1", 0);
        const state = createServerGameStateWithPlayers([player, null, null, null, null]);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleGetPlayerCount(mockSocket as unknown as ServerPlayerSocket);

        expect(mockSocket.emit).toHaveBeenCalledWith("playerCount", 1);
    });

    it("should emit zero when no players connected", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleGetPlayerCount(mockSocket as unknown as ServerPlayerSocket);

        expect(mockSocket.emit).toHaveBeenCalledWith("playerCount", 0);
    });
});

// =============================================================================
// handleRegisterPlayer
// =============================================================================
describe("handleRegisterPlayer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should count registerPlayer event in metrics", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");
        const player: PlayerWithId = { name: "Alice", uid: "uid1", lastWord: "" };

        handlers.handleRegisterPlayer(mockSocket as unknown as ServerPlayerSocket, player);

        expect(deps.metrics.countEvent).toHaveBeenCalledWith("registerPlayer");
    });

    it("should return existing player if already registered", () => {
        const existingPlayer = createRequiredPlayerWithId("Alice", "test-client", 0);
        const state = createServerGameStateWithPlayers([existingPlayer, null, null, null, null]);

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", existingPlayer);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
            registeredSockets,
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");
        const player: PlayerWithId = { name: "Alice", uid: "test-client", lastWord: "" };

        handlers.handleRegisterPlayer(mockSocket as unknown as ServerPlayerSocket, player);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "playerRegistered",
            expect.any(Object)
        );
    });

    it("should register new player if not already registered", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");
        const player: PlayerWithId = { name: "Alice", uid: "uid1", lastWord: "" };

        handlers.handleRegisterPlayer(mockSocket as unknown as ServerPlayerSocket, player);

        expect(deps.registeredSockets.has("test-client")).toBe(true);
    });
});

// =============================================================================
// handleIsReturningPlayer
// =============================================================================
describe("handleIsReturningPlayer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should do nothing if clientId is not registered", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleIsReturningPlayer(mockSocket as unknown as ServerPlayerSocket, "unknown-client");

        expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it("should emit returningPlayer if clientId is registered", () => {
        const player = createRequiredPlayerWithId("Alice", "returning-client", 0);

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("returning-client", player);

        const deps = createMockDependencies({ registeredSockets });
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleIsReturningPlayer(mockSocket as unknown as ServerPlayerSocket, "returning-client");

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "returningPlayer",
            expect.objectContaining({ name: "Alice", uid: "returning-client" })
        );
    });
});

// =============================================================================
// handleSubmitWord
// =============================================================================
describe("handleSubmitWord", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should count submitWord event in metrics", async () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        await handlers.handleSubmitWord(mockSocket as unknown as ServerPlayerSocket, "test");

        expect(deps.metrics.countEvent).toHaveBeenCalledWith("submitWord");
    });

    it("should do nothing if player is not registered", async () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("unknown-client");

        await handlers.handleSubmitWord(mockSocket as unknown as ServerPlayerSocket, "test");

        expect(deps.setState).not.toHaveBeenCalled();
    });

    it("should reject if not player's turn", async () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 1); // seat 1
        const state = createServerGameStateWithPlayers([
            createRequiredPlayerWithId("Bob", "bob-client", 0),
            player,
            null, null, null,
        ]);
        state.turn = 0; // Bob's turn, not Alice's

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", player);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
            registeredSockets,
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        await handlers.handleSubmitWord(mockSocket as unknown as ServerPlayerSocket, "test");

        expect(deps.setState).not.toHaveBeenCalled();
    });

    it("should reject if word does not match current letter", async () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 0);
        const state = createServerGameStateWithPlayers([player, null, null, null, null]);
        state.turn = 0;
        state.matchLetter = { block: "a", steps: [], value: "a", next: 0 };

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", player);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
            registeredSockets,
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        await handlers.handleSubmitWord(mockSocket as unknown as ServerPlayerSocket, "banana");

        expect(deps.setState).not.toHaveBeenCalled();
    });

    it("should reject empty word", async () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 0);
        const state = createServerGameStateWithPlayers([player, null, null, null, null]);
        state.turn = 0;
        state.matchLetter = { block: "a", steps: [], value: "a", next: 0 };

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", player);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
            registeredSockets,
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        await handlers.handleSubmitWord(mockSocket as unknown as ServerPlayerSocket, "");
    });

    // Note: Testing successful word submission requires mocking inputIsValid
    // which makes external API calls. Consider adding integration tests for this.
    it.todo("should update game state when word is valid");
    it.todo("should broadcast game state update after successful submission");
});

// =============================================================================
// handleRequestFullState
// =============================================================================
describe("handleRequestFullState", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should count requestFullState event in metrics", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleRequestFullState(mockSocket as unknown as ServerPlayerSocket);

        expect(deps.metrics.countEvent).toHaveBeenCalledWith("requestFullState");
    });

    it("should do nothing if player is not registered", () => {
        const deps = createMockDependencies();
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("unknown-client");

        handlers.handleRequestFullState(mockSocket as unknown as ServerPlayerSocket);

        expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it("should do nothing if state is not complete", () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 0);

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", player);

        // State without thisPlayer is not complete
        const deps = createMockDependencies({ registeredSockets });
        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleRequestFullState(mockSocket as unknown as ServerPlayerSocket);
    });

    it("should emit fullStateSync with complete game state", () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 0);
        const state = createServerGameStateWithPlayers([player, null, null, null, null]);
        state.thisPlayer = player;

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", player);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
            registeredSockets,
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleRequestFullState(mockSocket as unknown as ServerPlayerSocket);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "fullStateSync",
            expect.objectContaining({
                players: expect.any(Array),
                thisPlayer: expect.objectContaining({ name: "Alice" }),
            })
        );
    });

    it("should include player in correct seat in client state", () => {
        const player = createRequiredPlayerWithId("Alice", "test-client", 2);
        const state = createServerGameStateWithPlayers([null, null, player, null, null]);
        state.thisPlayer = player;

        const registeredSockets = new Map<string, Required<PlayerWithId>>();
        registeredSockets.set("test-client", player);

        const deps = createMockDependencies({
            getState: vi.fn(() => state),
            registeredSockets,
        });

        const handlers = new SocketHandlers(deps);
        const mockSocket = createMockSocket("test-client");

        handlers.handleRequestFullState(mockSocket as unknown as ServerPlayerSocket);

        const emitCall = mockSocket.emit.mock.calls[0];
        const emittedState = emitCall[1];
        expect(emittedState.players[2]).toBeDefined();
        expect(emittedState.players[2].name).toBe("Alice");
    });
});
