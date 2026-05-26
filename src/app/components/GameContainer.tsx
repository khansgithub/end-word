"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { UnexpectedConnectionStateError } from "@/shared/errors";
import { assertIsGameStateClient } from "@/shared/guards";
import type { GameStateClient } from "@/shared/types";
import { useUserStore } from "@/app/store/userStore";
import { gameStrings } from "@/lib/client/ui/game-strings";
import { buildLoginUrl } from "@/lib/client/ui/return-to";
import { joinRoomApi, leaveRoomApi, startRoomApi } from "@/lib/client/api/room";
import type { GameLanguage } from "@/shared/types";
import BusyOverlay from "@/app/components/BusyOverlay";
import { resetInput } from "@/app/components/InputBox";
import GameV2 from "@/app/components/game-v2/GameV2";

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
	const [roomName, setRoomName] = useState<string | null>(null);
	const [roomClosedMessage, setRoomClosedMessage] = useState<string | null>(null);
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
				setRoomName(meta.room.roomname ?? null);
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
						key={roomId}
						roomId={roomId}
						roomName={roomName}
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
				<div className="panel p-6 max-w-md app-ui" style={{ fontFamily: "var(--font-b-sans)" }}>
					<p style={{ color: "var(--b-danger)" }}>Could not join this room.</p>
					<button type="button" className="btn-fsm mt-4" onClick={() => router.push("/lobby")}>
						Back to lobby
					</button>
				</div>
			);
		default:
			throw new UnexpectedConnectionStateError(connection);
	}
}
