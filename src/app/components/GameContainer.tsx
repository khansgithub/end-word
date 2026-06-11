"use client";

import BusyOverlay from "@/app/components/BusyOverlay";
import { resetInput } from "@/app/components/InputBox";
import GameV2 from "@/app/components/game-v2/GameV2";
import { useUserStore } from "@/app/store/userStore";
import { joinRoomApi, leaveRoomApi, startRoomApi } from "@/lib/client/api/room";
import { gameStrings } from "@/lib/client/ui/game-strings";
import { buildLoginUrl } from "@/lib/client/ui/return-to";
import { UnexpectedConnectionStateError } from "@/shared/errors";
import { assertIsGameStateClient } from "@/shared/guards";
import type { GameLanguage, GameStateClient } from "@/shared/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const CONNECTED = 0;
const CONNECTING = 1;
const FAILED = 2;

export default function GameContainer({ roomId }: { roomId: string }) {
    const router = useRouter();
    const playerName = useUserStore((s) => s.playerName);
    const [connection, setConnection] = useState<
        typeof CONNECTED | typeof CONNECTING | typeof FAILED
    >(CONNECTING);
    const [gameState, setGameState] = useState<GameStateClient | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [language, setLanguage] = useState<GameLanguage>("ko");
    const [roomName, setRoomName] = useState<string | null>(null);
    const [roomClosedMessage, setRoomClosedMessage] = useState<string | null>(
        null,
    );
    const [isStartingGame, setIsStartingGame] = useState(false);
    const leaveContextRef = useRef({ roomId, connected: false });
    const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    leaveContextRef.current = {
        roomId,
        connected: connection === CONNECTED,
    };

    const handleStateChange = useCallback((next: GameStateClient) => {
        setGameState((prev) => (prev === next ? prev : next));
    }, []);

    useEffect(() => {
        console.log(
            `[GameContainer] useEffect: connection=${connection}, roomId=${roomId}, playerName=${playerName}`,
        );
        resetInput();

        if (!playerName) {
            router.push(buildLoginUrl(`/room/${roomId}`));
            return;
        }

        (async () => {
            console.log(
                `[GameContainer] Joining room ${roomId} as "${playerName}"`,
            );

            const metaRes = await fetch(`/api/rooms/${roomId}`);
            console.log(
                `[GameContainer] GET /api/rooms/${roomId} -> ${metaRes.status}`,
            );

            if (metaRes.status === 401) {
                const body = await metaRes.json();
                console.log(`[GameContainer] 401 body:`, body);
                if (body.siteLocked) {
                    console.log(
                        `[GameContainer] Site locked, redirecting to site-login`,
                    );
                    router.push(
                        `/site-login?returnTo=${encodeURIComponent(`/room/${roomId}`)}`,
                    );
                    return;
                }
            }
            if (metaRes.ok) {
                const meta = await metaRes.json();
                console.log(`[GameContainer] Room meta:`, {
                    language: meta.room.language,
                    roomName: meta.room.roomname,
                    hostUserId: meta.room.host_user_id,
                });
                setLanguage(meta.room.language ?? "ko");
                setRoomName(meta.room.roomname ?? null);
                const {
                    data: { user },
                } = await (await import("@/lib/supabase/client"))
                    .createClient()
                    .auth.getUser();
                console.log(
                    `[GameContainer] Supabase user:`,
                    user ? `${user.id} (${user.email})` : "null",
                );
                if (user) {
                    setUserId(user.id);
                    setIsHost(meta.room.host_user_id === user.id);
                    console.log(
                        `[GameContainer] isHost=${meta.room.host_user_id === user.id}`,
                    );
                }
            } else {
                console.warn(
                    `[GameContainer] Room meta fetch failed (${metaRes.status}), proceeding anyway`,
                );
            }

            console.log(
                `[GameContainer] Calling joinRoomApi({ roomId: "${roomId}", displayName: "${playerName}" })`,
            );
            const response = await joinRoomApi({
                roomId,
                displayName: playerName,
            });
            console.log(`[GameContainer] joinRoomApi response:`, {
                success: response.success,
                hasPlayer: response.success && !!response.player,
                hasGameState: response.success && !!response.gameState,
            });

            if (response.success && response.player) {
                console.log(
                    `[GameContainer] Join succeeded, setting CONNECTED`,
                );
                setGameState({
                    ...response.gameState,
                    thisPlayer: response.player,
                });
                setConnection(CONNECTED);
            } else {
                console.error(`[GameContainer] Join failed, setting FAILED`);
                setConnection(FAILED);
            }
        })();

        return () => {
            resetInput();
        };
    }, [roomId, playerName, router]);

    const handleRoomClosed = useCallback(() => {
        if (isHost) {
            router.push("/lobby");
            return;
        }
        setRoomClosedMessage(gameStrings.hostLeftTheRoom);
    }, [router, isHost]);

    useEffect(() => {
        if (!roomClosedMessage) return;
        const timeout = setTimeout(() => router.push("/lobby"), 2500);
        return () => clearTimeout(timeout);
    }, [roomClosedMessage, router]);

    // Cancel a pending leave from React Strict Mode's dev-only remount cycle.
    useEffect(() => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }
    }, []);

    // Tab close / refresh — do not call leave in effect cleanup (that runs on dep changes too).
    useEffect(() => {
        if (connection !== CONNECTED) return;

        const leaveOnUnload = () => {
            void leaveRoomApi(roomId);
        };

        window.addEventListener("pagehide", leaveOnUnload);
        return () => {
            window.removeEventListener("pagehide", leaveOnUnload);
        };
    }, [roomId, connection]);

    // Leaving the room page (client navigation or unmount) — debounced to ignore Strict Mode remounts.
    useEffect(() => {
        return () => {
            const { roomId: id, connected } = leaveContextRef.current;
            if (!connected) return;

            leaveTimeoutRef.current = setTimeout(() => {
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
                    <GameV2
                        gameState={gameState!}
                        isHost={isHost}
                        isStartingGame={isStartingGame}
                        key={roomId}
                        language={language}
                        onRoomClosed={handleRoomClosed}
                        onStartGame={handleStartGame}
                        onStateChange={handleStateChange}
                        roomId={roomId}
                        roomName={roomName}
                        userId={userId}
                   
                    />
                    {roomClosedMessage && (
                        <BusyOverlay
                            message={roomClosedMessage}
                            detail={gameStrings.returningToLobby}
                            role="alertdialog"
                        />
                    )}
                </>
            );
        case CONNECTING:
            return <BusyOverlay message={gameStrings.joiningRoomPage} />;
        case FAILED:
            return (
                <div
                    className="app-ui flex min-h-dvh w-full flex-col items-center justify-center p-4"
                    style={{
                        backgroundColor: "var(--b-bg)",
                        fontFamily: "var(--font-b-sans)",
                    }}
                >
                    <div className="panel w-full max-w-md">
                        <div className="flex flex-col items-center gap-4 p-4 text-center sm:p-6">
                            <p
                                className="text-sm sm:text-base"
                                style={{ color: "var(--b-danger)" }}
                            >
                                Could not join this room.
                            </p>
                            <button
                                type="button"
                                className="btn-fsm w-full sm:w-auto"
                                onClick={() => router.push("/lobby")}
                            >
                                Back to lobby
                            </button>
                        </div>
                    </div>
                </div>
            );
        default:
            throw new UnexpectedConnectionStateError(connection);
    }
}
