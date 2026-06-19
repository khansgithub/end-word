"use client";

import { resetInput } from "@/app/components/game/InputBox";
import { joinRoomApi, startRoomApi } from "@/lib/client/api/room";
import { buildLoginUrl } from "@/lib/client/ui/return-to";
import { fromEmitToGameStateClient } from "@/shared/GameState";
import type { GameLanguage, GameStateClient } from "@/shared/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/client/logging";

const L = "useJoinRoom";
const CONNECTED = 0;
const CONNECTING = 1;
const FAILED = 2;

type ConnectionState = typeof CONNECTED | typeof CONNECTING | typeof FAILED;

const CONN_LABEL: Record<ConnectionState, string> = {
    [CONNECTED]: "CONNECTED",
    [CONNECTING]: "CONNECTING",
    [FAILED]: "FAILED",
};

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

    logger.debug(L, "mount", { roomId, playerName });

    const handleStateChange = useCallback((next: GameStateClient) => {
        logger.debug(L, "handleStateChange", { status: next.status, turn: next.turn });
        setGameState((prev) => (prev === next ? prev : next));
    }, []);

    const handleStartGame = useCallback(async () => {
        if (isStartingGameRef.current) {
            logger.warn(L, "handleStartGame already starting, skipping");
            return;
        }
        logger.info(L, "handleStartGame");
        setIsStartingGame(true);
        try {
            const result = await startRoomApi(roomId);
            logger.info(L, "handleStartGame result", { success: result.success, hasGameState: !!result.gameState });
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
            logger.warn(L, "no playerName, redirecting to login");
            router.push(buildLoginUrl(`/room/${roomId}`));
            return;
        }

        let cancelled = false;

        (async () => {
            logger.info(L, "fetching room meta", { roomId });
            const metaRes = await fetch(`/api/rooms/${roomId}`);

            if (metaRes.ok) {
                const meta = await metaRes.json();
                logger.info(L, "room meta received", { language: meta.room.language, roomName: meta.room.roomname, hostUserId: meta.room.host_user_id });
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
                    const isHostUser = meta.room.host_user_id === user.id;
                    logger.info(L, "user identified", { userId: user.id, isHost: isHostUser });
                    setIsHost(isHostUser);
                }
            } else {
                logger.warn(L, "room meta fetch failed", { status: metaRes.status });
            }

            if (cancelled) return;

            logger.info(L, "joining room", { roomId, playerName });
            const response = await joinRoomApi({
                roomId,
                displayName: playerName,
            });

            if (!cancelled && response.success && response.player) {
                logger.info(L, "join success", { playerSeat: response.player.seat, playerName: response.player.name });
                setGameState(
                    fromEmitToGameStateClient(response.gameState, {
                        thisPlayer: response.player,
                    }),
                );
                setConnection(CONNECTED);
            } else if (!cancelled) {
			logger.error(L, "join failed", { reason: !response.success ? response.reason : undefined });
                setConnection(FAILED);
            }
        })();

        return () => {
            cancelled = true;
            resetInput();
            logger.debug(L, "cleanup (cancelled)");
        };
    }, [roomId, playerName, router]);

    logger.debug(L, "render", { connection: CONN_LABEL[connection], hasGameState: !!gameState, isHost });

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
