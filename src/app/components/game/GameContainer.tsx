"use client";

import BusyOverlay from "@/app/components/game/BusyOverlay";
import GameV2 from "@/app/components/game/GameV2";
import { useJoinRoom } from "@/app/hooks/useJoinRoom";
import { useLeaveRoom } from "@/app/hooks/useLeaveRoom";
import { useUserStore } from "@/app/store/userStore";
import { gameStrings } from "@/lib/client/ui/game-strings";
import { UnexpectedConnectionStateError } from "@/shared/errors";
import { assertIsGameStateClient } from "@/shared/guards";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const CONNECTED = 0;
const CONNECTING = 1;
const FAILED = 2;

type ConnectionState = typeof CONNECTED | typeof CONNECTING | typeof FAILED;

export default function GameContainer({ roomId }: { roomId: string }) {
    const router = useRouter();
    const playerName = useUserStore((s) => s.playerName);
    const [roomClosedMessage, setRoomClosedMessage] = useState<string | null>(
        null,
    );

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
