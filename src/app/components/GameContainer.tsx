"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { UnexpectedConnectionStateError } from "@/shared/errors";
import { assertIsGameStateClient } from "@/shared/guards";
import type { GameStateClient } from "@/shared/types";
import { useUserStore } from "@/app/store/userStore";
import { gameStrings } from "@/app/lib/gameStrings";
import { buildLoginUrl } from "@/app/lib/returnTo";
import { joinRoomApi, leaveRoomApi, startRoomApi } from "@/app/lib/roomApi";
import type { GameLanguage } from "@/lib/dictionary";
import Game from "@/app/components/Game";
import { resetInput } from "@/app/components/InputBox";

const CONNECTED = 0;
const CONNECTING = 1;
const FAILED = 2;

export default function GameContainer({ roomId }: { roomId: string }) {
    const router = useRouter();
    const playerName = useUserStore((s) => s.playerName);
    const [connection, setConnection] = useState<typeof CONNECTED | typeof CONNECTING | typeof FAILED>(
        CONNECTING
    );
    const [gameState, setGameState] = useState<GameStateClient | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [language, setLanguage] = useState<GameLanguage>("ko");
    const [roomClosedMessage, setRoomClosedMessage] = useState<string | null>(null);
    const [isStartingGame, setIsStartingGame] = useState(false);
    const hostLeaveContextRef = useRef({ isHost: false, roomId, connected: false });
    const hostLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    hostLeaveContextRef.current = {
        isHost,
        roomId,
        connected: connection === CONNECTED,
    };

    const handleStateChange = useCallback((next: GameStateClient) => {
        setGameState((prev) => (prev === next ? prev : next));
    }, []);

    useEffect(() => {
        resetInput();

        if (!playerName) {
            router.replace(buildLoginUrl(`/room/${roomId}`));
            return;
        }

        (async () => {
            const metaRes = await fetch(`/api/rooms/${roomId}`);
            if (metaRes.ok) {
                const meta = await metaRes.json();
                setLanguage(meta.room.language ?? "ko");
                const {
                    data: { user },
                } = await (await import("@/lib/supabase/client")).createClient().auth.getUser();
                if (user) {
                    setUserId(user.id);
                    setIsHost(meta.room.host_user_id === user.id);
                }
            }

            const response = await joinRoomApi({ roomId, displayName: playerName });
            if (response.success && response.player) {
                setGameState({
                    ...response.gameState,
                    thisPlayer: response.player,
                });
                setConnection(CONNECTED);
            } else {
                setConnection(FAILED);
            }
        })();

        return () => {
            resetInput();
        };
    }, [roomId, playerName, router]);

    const handleRoomClosed = useCallback(() => {
        if (isHost) {
            router.replace("/lobby");
            return;
        }
        setRoomClosedMessage(gameStrings.hostLeftTheRoom);
    }, [router, isHost]);

    useEffect(() => {
        if (!roomClosedMessage) return;
        const timeout = setTimeout(() => router.replace("/lobby"), 2500);
        return () => clearTimeout(timeout);
    }, [roomClosedMessage, router]);

    // Cancel a pending host-leave from React Strict Mode's dev-only remount cycle.
    useEffect(() => {
        if (hostLeaveTimeoutRef.current) {
            clearTimeout(hostLeaveTimeoutRef.current);
            hostLeaveTimeoutRef.current = null;
        }
    }, []);

    // Tab close / refresh — do not call leave in effect cleanup (that runs on dep changes too).
    useEffect(() => {
        if (!isHost || connection !== CONNECTED) return;

        const leaveAsHost = () => {
            void leaveRoomApi(roomId);
        };

        window.addEventListener("pagehide", leaveAsHost);
        return () => {
            window.removeEventListener("pagehide", leaveAsHost);
        };
    }, [isHost, roomId, connection]);

    // Leaving the room page (client navigation or unmount) — debounced to ignore Strict Mode remounts.
    useEffect(() => {
        return () => {
            const { isHost: wasHost, roomId: id, connected } = hostLeaveContextRef.current;
            if (!wasHost || !connected) return;

            hostLeaveTimeoutRef.current = setTimeout(() => {
                void leaveRoomApi(id);
            }, 100);
        };
    }, []);

    async function handleStartGame() {
        if (isStartingGame) return;
        setIsStartingGame(true);
        try {
            const result = await startRoomApi(roomId);
            if (result.success && result.gameState && gameState) {
                setGameState({
                    ...gameState,
                    ...result.gameState,
                    thisPlayer: gameState.thisPlayer,
                });
            }
        } finally {
            setIsStartingGame(false);
        }
    }

    if (!playerName) return null;

    switch (connection) {
        case CONNECTED:
            assertIsGameStateClient(gameState!);
            if (!userId) return null;
            return (
                <>
                    <Game
                        key={roomId}
                        roomId={roomId}
                        userId={userId}
                        gameState={gameState!}
                        language={language}
                        onStateChange={handleStateChange}
                        onRoomClosed={handleRoomClosed}
                        isHost={isHost}
                        onStartGame={handleStartGame}
                        isStartingGame={isStartingGame}
                    />
                    {roomClosedMessage && (
                        <div
                            className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm"
                            style={{ backgroundColor: "var(--bg-overlay)" }}
                            role="alertdialog"
                            aria-live="assertive"
                            aria-labelledby="room-closed-title"
                        >
                            <div className="panel">
                                <div className="flex flex-col items-center p-6 gap-2">
                                    <p
                                        id="room-closed-title"
                                        className="text-lg text-center"
                                        style={{ color: "var(--text-primary)" }}
                                    >
                                        {roomClosedMessage}
                                    </p>
                                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                        {gameStrings.returningToLobby}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            );
        case CONNECTING:
            return (
                <div className="flex flex-col items-center p-6">
                    <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
                    <p style={{ color: "var(--text-primary)" }}>Joining room…</p>
                </div>
            );
        case FAILED:
            return (
                <div className="panel p-6 max-w-md">
                    <p style={{ color: "var(--text-error)" }}>Could not join this room.</p>
                    <button type="button" className="btn-fsm mt-4" onClick={() => router.push("/lobby")}>
                        Back to lobby
                    </button>
                </div>
            );
        default:
            throw new UnexpectedConnectionStateError(connection);
    }
}
