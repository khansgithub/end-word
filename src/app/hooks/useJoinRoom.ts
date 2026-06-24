"use client";

import { resetInput } from "@/app/components/game/InputBox";
import { joinRoomApi, startRoomApi } from "@/lib/client/api/room";
import { buildLoginUrl } from "@/lib/client/ui/return-to";
import { fromEmitToGameStateClient } from "@/shared/GameState";
import type { GameLanguage, GameStateClient } from "@/shared/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConsoleTransport, LogLayer } from 'loglayer';

const L = "useJoinRoom";
const logger = new LogLayer({
	transport: new ConsoleTransport({
		logger: console,
		enabled: process.env.NODE_ENV !== "production",
		appendObjectData: true
	})
}).withPrefix(L)
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

    logger.withMetadata({ roomId, playerName }).debug("mount");

    const handleStateChange = useCallback((next: GameStateClient) => {
        logger.withMetadata({ status: next.status, turn: next.turn }).debug("handleStateChange");
        setGameState((prev) => (prev === next ? prev : next));
    }, []);

    const handleStartGame = useCallback(async () => {
        if (isStartingGameRef.current) {
            logger.warn("handleStartGame already starting, skipping");
            return;
        }
        logger.info("handleStartGame");
        setIsStartingGame(true);
        try {
            const result = await startRoomApi(roomId);
            logger.withMetadata({ success: result.success, hasGameState: !!result.gameState }).info("handleStartGame result");
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
            logger.warn("no playerName, redirecting to login");
            router.push(buildLoginUrl(`/room/${roomId}`));
            return;
        }

        let cancelled = false;

        (async () => {
            logger.withMetadata({ roomId }).info("fetching room meta");
            const metaRes = await fetch(`/api/rooms/${roomId}`);

            if (metaRes.ok) {
                const meta = await metaRes.json();
                logger.withMetadata({ language: meta.room.language, roomName: meta.room.roomname, hostUserId: meta.room.host_user_id }).info("room meta received");
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
                    logger.withMetadata({ userId: user.id, isHost: isHostUser }).info("user identified");
                    setIsHost(isHostUser);
                }
            } else {
                logger.withMetadata({ status: metaRes.status }).warn("room meta fetch failed");
            }

            if (cancelled) return;

            logger.withMetadata({ roomId, playerName }).info("joining room");
            const response = await joinRoomApi({
                roomId,
                displayName: playerName,
            });

            if (!cancelled && response.success && response.player) {
                logger.withMetadata({ playerSeat: response.player.seat, playerName: response.player.name }).info("join success");
                setGameState(
                    fromEmitToGameStateClient(response.gameState, {
                        thisPlayer: response.player,
                    }),
                );
                setConnection(CONNECTED);
            } else if (!cancelled) {
			logger.withMetadata({ reason: !response.success ? response.reason : undefined }).error("join failed");
                setConnection(FAILED);
            }
        })();

        return () => {
            cancelled = true;
            resetInput();
            logger.debug("cleanup (cancelled)");
        };
    }, [roomId, playerName, router]);

    logger.withMetadata({ connection: CONN_LABEL[connection], hasGameState: !!gameState, isHost }).debug("render");

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
