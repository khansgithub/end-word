"use client";

import { resetInput } from "@/app/components/game/InputBox";
import { joinRoomApi, startRoomApi } from "@/lib/client/api/room";
import { buildLoginUrl } from "@/lib/client/ui/return-to";
import { fromEmitToGameStateClient } from "@/shared/GameState";
import type { GameLanguage, GameStateClient } from "@/shared/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const CONNECTED = 0;
const CONNECTING = 1;
const FAILED = 2;

type ConnectionState = typeof CONNECTED | typeof CONNECTING | typeof FAILED;

export interface JoinRoomResult {
    connection: ConnectionState;
    gameState: GameStateClient | null;
    isHost: boolean;
    userId: string | null;
    language: GameLanguage;
    roomName: string | null;
    isStartingGame: boolean;
    handleStateChange: (next: GameStateClient) => void;
    handleStartGame: () => Promise<void>;
}

export function useJoinRoom(roomId: string, playerName: string): JoinRoomResult {
    const router = useRouter();
    const [connection, setConnection] = useState<ConnectionState>(CONNECTING);
    const [gameState, setGameState] = useState<GameStateClient | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [language, setLanguage] = useState<GameLanguage>("ko");
    const [roomName, setRoomName] = useState<string | null>(null);
    const [isStartingGame, setIsStartingGame] = useState(false);

    const isStartingGameRef = useRef(isStartingGame);
    isStartingGameRef.current = isStartingGame;

    const handleStateChange = useCallback((next: GameStateClient) => {
        setGameState((prev) => (prev === next ? prev : next));
    }, []);

    const handleStartGame = useCallback(async () => {
        if (isStartingGameRef.current) return;
        setIsStartingGame(true);
        try {
            const result = await startRoomApi(roomId);
            if (result.success && result.gameState) {
                setGameState((prev) => {
                    if (!prev) return prev;
                    return { ...prev, ...result.gameState, thisPlayer: prev.thisPlayer };
                });
            }
        } finally {
            setIsStartingGame(false);
        }
    }, [roomId]);

    useEffect(() => {
        resetInput();

        if (!playerName) {
            router.push(buildLoginUrl(`/room/${roomId}`));
            return;
        }

        let cancelled = false;

        (async () => {
            const metaRes = await fetch(`/api/rooms/${roomId}`);

            // Dead code: site-lock enforcement is now handled entirely in the proxy
            // middleware — no route returns { siteLocked: true } anymore.
            // if (metaRes.status === 401) {
            //     const body = await metaRes.json();
            //     if (body.siteLocked) {
            //         router.push(
            //             `/site-login?returnTo=${encodeURIComponent(`/room/${roomId}`)}`,
            //         );
            //         return;
            //     }
            // }

            if (metaRes.ok) {
                const meta = await metaRes.json();
                if (!cancelled) {
                    setLanguage(meta.room.language ?? "ko");
                    setRoomName(meta.room.roomname ?? null);
                }
                const {
                    data: { user },
                } = await (await import("@/lib/supabase/client"))
                    .createClient()
                    .auth.getUser();
                if (!cancelled && user) {
                    setUserId(user.id);
                    setIsHost(meta.room.host_user_id === user.id);
                }
            }

            if (cancelled) return;

            const response = await joinRoomApi({
                roomId,
                displayName: playerName,
            });

            if (!cancelled && response.success && response.player) {
                setGameState(
                    fromEmitToGameStateClient(response.gameState, {
                        thisPlayer: response.player,
                    }),
                );
                setConnection(CONNECTED);
            } else if (!cancelled) {
                setConnection(FAILED);
            }
        })();

        return () => {
            cancelled = true;
            resetInput();
        };
    }, [roomId, playerName, router]);

    return {
        connection,
        gameState,
        isHost,
        userId,
        language,
        roomName,
        isStartingGame,
        handleStateChange,
        handleStartGame,
    };
}
