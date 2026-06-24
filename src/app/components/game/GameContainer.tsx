"use client";

import BusyOverlay from "@/app/components/game/BusyOverlay";
import GameV2 from "@/app/components/game/GameV2";
import SpectatorView from "@/app/components/game/SpectatorView";
import { useJoinRoom } from "@/app/hooks/useJoinRoom";
import { useLeaveRoom } from "@/app/hooks/useLeaveRoom";
import { useUserStore } from "@/app/store/userStore";
import { gameStrings } from "@/lib/client/ui/game-strings";
import { buildLoginUrl } from "@/lib/client/ui/return-to";
import { UnexpectedConnectionStateError } from "@/shared/errors";
import { assertIsGameStateClient } from "@/shared/guards";
import type { GameStateEmit } from "@/shared/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConsoleTransport, LogLayer } from 'loglayer';

const CONNECTED = 0;
const CONNECTING = 1;
const FAILED = 2;

type ConnectionState = typeof CONNECTED | typeof CONNECTING | typeof FAILED;
type Mode =
    | "initial"
    | "choose"
    | "full"
    | "joining"
    | "playing"
    | "spectating"
    | "failed"
    | "dissolved";

type RoomMeta = {
    roomid: string;
    roomname: string | null;
    status: string;
    connectedPlayers: number;
    language: string;
    host_user_id: string | null;
};

const L = "GameContainer";
const logger = new LogLayer({
	transport: new ConsoleTransport({
		logger: console,
		enabled: process.env.NODE_ENV !== "production",
		appendObjectData: true
	})
}).withPrefix(L)

function GameV2Flow({
    roomId,
    onJoinComplete,
}: {
    roomId: string;
    onJoinComplete: (userId: string) => void;
}) {
    const router = useRouter();
    const playerName = useUserStore((s) => s.playerName);
    const [roomClosedMessage, setRoomClosedMessage] = useState<string | null>(
        null,
    );
    const joinedRef = useRef(false);

    logger.withMetadata({ roomId, playerName }).info("GameV2Flow mount");

    const {
        connection,
        gameState,
        isHost,
        userId,
        language,
        roomName,
        isStartingGame,
        handleStateChange,
        handleStartGame,
    } = useJoinRoom(roomId, playerName);

    useLeaveRoom(roomId, connection);

    useEffect(() => {
        if (connection === CONNECTED && userId && !joinedRef.current) {
            joinedRef.current = true;
            logger.withMetadata({ userId }).info("join complete");
            onJoinComplete(userId);
        }
    }, [connection, userId, onJoinComplete]);

    const handleRoomClosed = useCallback(() => {
        logger.withMetadata({ isHost }).info("handleRoomClosed");
        if (isHost) {
            router.push("/lobby");
            return;
        }
        setRoomClosedMessage(gameStrings.hostLeftTheRoom);
    }, [router, isHost]);

    useEffect(() => {
        if (!roomClosedMessage) return;
        logger.info("room closed, redirecting to lobby");
        const timeout = setTimeout(() => router.push("/lobby"), 2500);
        return () => clearTimeout(timeout);
    }, [roomClosedMessage, router]);

    if (!playerName) {
        logger.warn("no playerName, redirecting to login");
        router.push(buildLoginUrl(`/room/${roomId}`));
        return null;
    }

    switch (connection) {
        case CONNECTED:
            assertIsGameStateClient(gameState!);
            if (!userId) return null;
            logger.debug("rendering GameV2 (CONNECTED)");
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
            logger.debug("rendering BusyOverlay (CONNECTING)");
            return <BusyOverlay message={gameStrings.joiningRoomPage} />;
        case FAILED:
            logger.error(L, "rendering FAILED state");
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
                                {gameStrings.couldNotJoinRoom}
                            </p>
                            <button
                                type="button"
                                className="btn-fsm w-full sm:w-auto"
                                onClick={() => router.push("/lobby")}
                            >
                                {gameStrings.backToLobby}
                            </button>
                        </div>
                    </div>
                </div>
            );
        default:
            throw new UnexpectedConnectionStateError(connection);
    }
}

export default function GameContainer({ roomId }: { roomId: string }) {
    const router = useRouter();
    const playerName = useUserStore((s) => s.playerName);
    const [mode, setMode] = useState<Mode>("initial");
    const [roomMeta, setRoomMeta] = useState<RoomMeta | null>(null);
    const [spectatorEmit, setSpectatorEmit] =
        useState<GameStateEmit | null>(null);
    const [spectatorUserId, setSpectatorUserId] = useState<string | null>(null);
    const [roomClosedMessage, setRoomClosedMessage] = useState<string | null>(
        null,
    );

    logger.withMetadata({ roomId, playerName, mode }).info("GameContainer mount");

    useEffect(() => {
        if (!playerName) {
            logger.warn("no playerName, redirecting to login");
            router.push(buildLoginUrl(`/room/${roomId}`));
            return;
        }

        setMode("initial");

        (async () => {
            try {
                logger.withMetadata({ roomId }).info("fetching room meta for GameContainer");
                const { createClient } = await import("@/lib/supabase/client");
                const {
                    data: { user },
                } = await createClient().auth.getUser();

                const res = await fetch(`/api/rooms/${roomId}`);
                if (!res.ok) {
                    logger.withMetadata({ status: res.status }).warn("room meta fetch failed");
                    setMode("failed");
                    return;
                }
                const data = await res.json();
                const meta: RoomMeta = {
                    roomid: data.room.roomid,
                    roomname: data.room.roomname,
                    status: data.room.status,
                    connectedPlayers: data.room.connected_players,
                    language: data.room.language,
                    host_user_id: data.room.host_user_id,
                };
                setRoomMeta(meta);
                logger.withMetadata({ meta, userId: user?.id, isHost: user && meta.host_user_id === user.id }).info("room meta fetched");

                if (user && meta.host_user_id === user.id) {
                    logger.info("mode -> joining (host auto-join)");
                    setMode("joining");
                } else if (meta.connectedPlayers >= 4) {
                    logger.info("mode -> full");
                    setMode("full");
                } else {
                    logger.info("mode -> choose");
                    setMode("choose");
                }
            } catch (err) {
                logger.withMetadata({ err }).error("room meta fetch exception");
                setMode("failed");
            }
        })();
    }, [roomId, playerName, router]);

    const handleJoin = useCallback(() => {
        logger.info("handleJoin -> joining");
        setMode("joining");
    }, []);

    const handleJoinComplete = useCallback((_userId: string) => {
        logger.withMetadata({ userId: _userId }).info("handleJoinComplete (staying in joining mode)");
    }, []);

    const handleSpectate = useCallback(async () => {
        logger.info("handleSpectate");
        try {
            const { createClient } = await import("@/lib/supabase/client");
            const {
                data: { user },
            } = await createClient().auth.getUser();
            if (!user) {
                logger.error(L, "spectate: no user");
                setMode("failed");
                return;
            }
            setSpectatorUserId(user.id);

            const res = await fetch(`/api/rooms/${roomId}/spectate`, {
                method: "POST",
            });
            if (!res.ok) {
                logger.withMetadata({ status: res.status }).warn("spectate fetch failed");
                setMode("failed");
                return;
            }
            const data = await res.json();
            if (data.dissolved) {
                logger.info("spectate: room dissolved");
                setMode("dissolved");
                return;
            }
            logger.info("spectate: joined as spectator");
            setSpectatorEmit(data.gameState);
            setMode("spectating");
        } catch {
            logger.error(L, "spectate exception");
            setMode("failed");
        }
    }, [roomId]);

    const handleBackToLobby = useCallback(() => {
        logger.info("handleBackToLobby");
        router.push("/lobby");
    }, [router]);

    const handleRoomClosed = useCallback(() => {
        logger.info("handleRoomClosed (spectator)");
        setRoomClosedMessage(gameStrings.hostLeftTheRoom);
    }, []);

    useEffect(() => {
        if (!roomClosedMessage) return;
        logger.info("roomClosedMessage set, redirecting to lobby");
        const timeout = setTimeout(() => router.push("/lobby"), 2500);
        return () => clearTimeout(timeout);
    }, [roomClosedMessage, router]);

    if (mode === "joining") {
        return (
            <GameV2Flow
                roomId={roomId}
                onJoinComplete={handleJoinComplete}
            />
        );
    }

    if (mode === "spectating" && spectatorEmit && spectatorEmit.players && spectatorUserId) {
        return (
            <>
                <SpectatorView
                    roomId={roomId}
                    roomName={roomMeta?.roomname ?? null}
                    userId={spectatorUserId ?? ""}
                    initialEmit={spectatorEmit}
                    language={
                        (roomMeta?.language as "en" | "ko") ?? "ko"
                    }
                    onRoomClosed={handleRoomClosed}
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
    }

    if (mode === "choose" || mode === "full") {
        const isFull = mode === "full";
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
                            className="text-sm sm:text-base font-semibold"
                            style={{ color: "var(--text-primary)" }}
                        >
                            {roomMeta?.roomname ?? gameStrings.roomUnnamed}
                        </p>
                        {isFull && (
                            <p
                                className="text-sm"
                                style={{ color: "var(--b-danger)" }}
                            >
                                {gameStrings.roomIsFull}
                            </p>
                        )}
                        <div className="flex flex-col w-full gap-2 sm:flex-row">
                            {!isFull && (
                                <button
                                    type="button"
                                    className="btn-fsm w-full sm:w-auto"
                                    onClick={handleJoin}
                                >
                                    {gameStrings.joinAsPlayer}
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn-fsm w-full sm:w-auto"
                                onClick={handleSpectate}
                            >
                                {gameStrings.spectate}
                            </button>
                            <button
                                type="button"
                                className="btn-fsm w-full sm:w-auto"
                                onClick={handleBackToLobby}
                            >
                                {gameStrings.backToLobby}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === "dissolved") {
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
                            {gameStrings.roomDissolved}
                        </p>
                        <button
                            type="button"
                            className="btn-fsm w-full sm:w-auto"
                            onClick={handleBackToLobby}
                        >
                            {gameStrings.backToLobby}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === "initial") {
        return <BusyOverlay message={gameStrings.loading} />;
    }

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
                        {gameStrings.couldNotJoinRoom}
                    </p>
                    <button
                        type="button"
                        className="btn-fsm w-full sm:w-auto"
                        onClick={handleBackToLobby}
                    >
                        {gameStrings.backToLobby}
                    </button>
                </div>
            </div>
        </div>
    );
}
