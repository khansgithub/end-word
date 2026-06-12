"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_PLAYERS } from "@/shared/consts";
import { useUserStore } from "@/app/store/userStore";
import { buildLoginUrl } from "@/lib/client/ui/return-to";
import { createRoomApi, fetchLobbyRooms, joinRoomApi } from "@/lib/client/api/room";
import type { RoomListItem } from "@/shared/roomTypes";
import type { GameLanguage } from "@/shared/types";
import { DEFAULT_TIMER_DURATION } from "@/shared/consts";
import BusyOverlay from "@/app/components/BusyOverlay";
import { gameStrings } from "@/lib/client/ui/game-strings";

type LobbyBusy = "create" | "join";

export default function LobbyPage() {
	const router = useRouter();
	const playerName = useUserStore((s) => s.playerName);
	const [rooms, setRooms] = useState<RoomListItem[]>([]);
	const [inviteCode, setInviteCode] = useState("");
	const [roomName, setRoomName] = useState("");
	const [language, setLanguage] = useState<GameLanguage>("ko");
	const [isPrivate, setIsPrivate] = useState(false);
	const [timerDuration, setTimerDuration] = useState<number>(DEFAULT_TIMER_DURATION);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [lobbyBusy, setLobbyBusy] = useState<LobbyBusy | null>(null);
	const lobbyBusyRef = useRef(false);
	const createRoomFormRef = useRef<HTMLFormElement>(null);

	const isLobbyBusy = lobbyBusy !== null;
	const busyMessage = lobbyBusy === "create" ? gameStrings.creatingRoom : gameStrings.joiningRoom;
	lobbyBusyRef.current = isLobbyBusy;

	const loadRooms = useCallback(async () => {
		if (lobbyBusyRef.current) return;
		try {
			const list = await fetchLobbyRooms();
			setRooms(list);
		} catch {
			setError("Could not load rooms");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!playerName) {
			router.push(buildLoginUrl("/lobby"));
			return;
		}
		loadRooms();
		const interval = setInterval(loadRooms, 5000);
		return () => clearInterval(interval);
	}, [playerName, router, loadRooms]);

	function handleCreateClick() {
		if (isLobbyBusy || !createRoomFormRef.current?.reportValidity()) return;
		setLobbyBusy("create");
		void handleCreate();
	}

	async function handleCreate() {
		setError(null);
		try {
			const { room } = await createRoomApi({
				roomName: roomName.trim(),
				language,
				isPrivate,
				timerDuration,
			});
			const join = await joinRoomApi({
				roomId: room.roomid,
				displayName: playerName!,
			});
			if (join.success) {
				router.push(`/room/${room.roomid}`);
			} else {
				setError(join.reason);
				setLobbyBusy(null);
			}
		} catch {
			setError("Failed to create room");
			setLobbyBusy(null);
		}
	}

	function handleJoinRoom(roomId: string) {
		if (isLobbyBusy) return;
		setLobbyBusy("join");
		setError(null);
		void (async () => {
			try {
				const join = await joinRoomApi({ roomId, displayName: playerName! });
				if (join.success) router.push(`/room/${roomId}`);
				else {
					setError(join.reason);
					setLobbyBusy(null);
				}
			} catch {
				setError("Failed to join room");
				setLobbyBusy(null);
			}
		})();
	}

	function handleJoinByCode() {
		if (isLobbyBusy) return;
		const code = inviteCode.trim();
		if (!code) {
			setError("Enter an invite code");
			return;
		}
		setLobbyBusy("join");
		setError(null);
		void (async () => {
			try {
				const join = await joinRoomApi({
					inviteCode: code,
					displayName: playerName!,
				});
				if (join.success) router.push(`/room/${join.roomId}`);
				else {
					setError(join.reason);
					setLobbyBusy(null);
				}
			} catch {
				setError("Failed to join room");
				setLobbyBusy(null);
			}
		})();
	}

	if (!playerName) return null;

	return (
		<div
			className="app-ui w-full max-w-lg p-4 flex flex-col gap-4"
			style={{ fontFamily: "var(--font-b-sans)" }}
		>
			{isLobbyBusy && <BusyOverlay message={busyMessage} />}
			<h1
				className="text-2xl font-normal tracking-tight"
				style={{ fontFamily: "var(--font-b-display)", color: "var(--b-fg)" }}
			>
				Lobby
			</h1>
			{error && (
				<p className="text-sm" style={{ color: "var(--b-danger)" }}>
					{error}
				</p>
			)}
			<fieldset disabled={isLobbyBusy} className="contents">
				<form
					ref={createRoomFormRef}
					className="panel p-4 flex flex-col gap-3"
					onSubmit={(e) => e.preventDefault()}
				>
					<h2 className="font-semibold" style={{ color: "var(--b-fg)" }}>
						Create room
					</h2>
					<input
						name="roomName"
						className="app-input input input-bordered h-11 w-full rounded-xl border"
						value={roomName}
						onChange={(e) => setRoomName(e.target.value)}
						placeholder="Enter room name"
						required
						pattern=".*\S.*"
						title="Enter a room name (not blank or whitespace only)"
					/>
					<div className="flex gap-2">
						<button
							type="button"
							className={`btn-fsm btn-fsm--ghost flex-1 ${language === "ko" ? "btn-fsm--active" : ""}`}
							onClick={() => setLanguage("ko")}
						>
							Korean
						</button>
						<button
							type="button"
							className={`btn-fsm btn-fsm--ghost flex-1 ${language === "en" ? "btn-fsm--active" : ""}`}
							onClick={() => setLanguage("en")}
						>
							English
						</button>
					</div>
					<div>
						<p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--b-muted)" }}>
							Timer per player
						</p>
						<div className="flex gap-1">
							{[15, 30, 45, 60, 90].map((t) => (
								<button
									key={t}
									type="button"
									className={`btn-fsm btn-fsm--ghost flex-1 ${timerDuration === t ? "btn-fsm--active" : ""}`}
									onClick={() => setTimerDuration(t)}
								>
									{t}s
								</button>
							))}
						</div>
					</div>
					<label className="flex items-center gap-2 text-sm" style={{ color: "var(--b-muted)" }}>
						<input
							type="checkbox"
							checked={isPrivate}
							onChange={(e) => setIsPrivate(e.target.checked)}
						/>
						Private room (invite code only)
					</label>
					<button type="button" className="btn-fsm" onClick={handleCreateClick}>
						Create & join
					</button>
				</form>
				<section className="panel p-4 flex flex-col gap-3">
					<h2 className="font-semibold" style={{ color: "var(--b-fg)" }}>
						Join with code
					</h2>
					<input
						className="app-input input input-bordered h-11 w-full rounded-xl border uppercase"
						value={inviteCode}
						onChange={(e) => setInviteCode(e.target.value)}
						placeholder="Invite code"
						maxLength={6}
					/>
					<button type="button" className="btn-fsm" onClick={handleJoinByCode}>
						Join
					</button>
				</section>
				<section className="panel p-4">
					<h2 className="font-semibold mb-3" style={{ color: "var(--b-fg)" }}>
						Public rooms
					</h2>
					{loading ? (
						<p style={{ color: "var(--b-muted)" }}>Loading…</p>
					) : rooms.length === 0 ? (
						<p style={{ color: "var(--b-muted)" }}>No public rooms open</p>
					) : (
						<ul className="flex flex-col gap-2">
							{rooms.map((r) => (
								<li
									key={r.roomid}
									className="flex justify-between items-center p-2 rounded border"
									style={{ borderColor: "var(--b-line)" }}
								>
									<div>
										<div className="font-medium" style={{ color: "var(--b-fg)" }}>
											{r.roomname ?? "Unnamed"}
										</div>
										<div className="text-xs" style={{ color: "var(--b-muted)" }}>
											{r.language.toUpperCase()} · {r.connected_players}/{MAX_PLAYERS} · {r.status}
										</div>
									</div>
									<button
										type="button"
										className="btn-fsm text-sm px-3 py-1"
										onClick={() => handleJoinRoom(r.roomid)}
									>
										Join
									</button>
								</li>
							))}
						</ul>
					)}
				</section>
			</fieldset>
		</div>
	);
}
