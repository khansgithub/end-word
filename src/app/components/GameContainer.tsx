"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UnexpectedConnectionStateError } from "@/shared/errors";
import { assertIsGameStateClient } from "@/shared/guards";
import type { GameStateClient } from "@/shared/types";
import { useUserStore } from "@/app/store/userStore";
import { joinRoomApi, startRoomApi } from "@/app/lib/roomApi";
import type { GameLanguage } from "@/lib/dictionary";
import Game from "./Game";

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
  const [language, setLanguage] = useState<GameLanguage>("ko");

  useEffect(() => {
    if (!playerName) {
      router.replace("/");
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
        if (user) setIsHost(meta.room.host_user_id === user.id);
      }

      const response = await joinRoomApi({ roomId, displayName: playerName });
      if (response.success) {
        setGameState({
          ...response.gameState,
          thisPlayer: response.player,
        });
        setConnection(CONNECTED);
      } else {
        setConnection(FAILED);
      }
    })();
  }, [roomId, playerName, router]);

  async function handleStartGame() {
    const result = await startRoomApi(roomId);
    if (result.success && result.gameState && gameState) {
      setGameState({
        ...gameState,
        ...result.gameState,
        thisPlayer: gameState.thisPlayer,
      });
    }
  }

  if (!playerName) return null;

  switch (connection) {
    case CONNECTED:
      assertIsGameStateClient(gameState!);
      return (
        <>
          {isHost && gameState!.status === "waiting" && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50">
              <button type="button" className="btn-fsm" onClick={handleStartGame}>
                Start game
              </button>
            </div>
          )}
          <Game
            roomId={roomId}
            gameState={gameState!}
            language={language}
            onStateChange={setGameState}
          />
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
