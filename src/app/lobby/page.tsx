"use client";



import { useRouter } from "next/navigation";

import { useCallback, useEffect, useRef, useState } from "react";

import { MAX_PLAYERS } from "@/shared/consts";

import { useUserStore } from "@/app/store/userStore";

import { buildLoginUrl } from "@/lib/client/ui/return-to";

import {

	createRoomApi,

	fetchLobbyRooms,

	joinRoomApi,

} from "@/lib/client/api/room";

import type { RoomListItem } from "@/shared/roomTypes";

import type { GameLanguage } from "@/shared/types";

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

	const [error, setError] = useState<string | null>(null);

	const [loading, setLoading] = useState(true);

	const [lobbyBusy, setLobbyBusy] = useState<LobbyBusy | null>(null);

	const lobbyBusyRef = useRef(false);

	const createRoomFormRef = useRef<HTMLFormElement>(null);



	const isLobbyBusy = lobbyBusy !== null;

	const busyMessage =

		lobbyBusy === "create" ? gameStrings.creatingRoom : gameStrings.joiningRoom;



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

			router.replace(buildLoginUrl("/lobby"));

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

		<div className="w-full max-w-lg p-4 flex flex-col gap-4">

			{isLobbyBusy && <BusyOverlay message={busyMessage} />}



			<h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>

				Lobby

			</h1>



			{error && (

				<p className="text-sm" style={{ color: "var(--text-error)" }}>

					{error}

				</p>

			)}



			<fieldset disabled={isLobbyBusy} className="contents">

				<form

					ref={createRoomFormRef}

					className="panel p-4 flex flex-col gap-3"

					onSubmit={(e) => e.preventDefault()}

				>

					<h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>

						Create room

					</h2>

					<input

						name="roomName"

						className="input w-full"

						value={roomName}

						onChange={(e) => setRoomName(e.target.value)}

						placeholder="Enter room name"

						style={{ padding: "0.5rem", borderRadius: "0.4rem" }}

						required

						pattern=".*\S.*"

						title="Enter a room name (not blank or whitespace only)"

					/>

					<div className="flex gap-2">

						<button

							type="button"

							className={`btn-fsm flex-1 ${language === "ko" ? "" : "opacity-60"}`}

							onClick={() => setLanguage("ko")}

						>

							Korean

						</button>

						<button

							type="button"

							className={`btn-fsm flex-1 ${language === "en" ? "" : "opacity-60"}`}

							onClick={() => setLanguage("en")}

						>

							English

						</button>

					</div>

					<label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>

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

					<h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>

						Join with code

					</h2>

					<input

						className="input w-full uppercase"

						value={inviteCode}

						onChange={(e) => setInviteCode(e.target.value)}

						placeholder="Invite code"

						maxLength={6}

						style={{ padding: "0.5rem", borderRadius: "0.4rem" }}

					/>

					<button type="button" className="btn-fsm" onClick={handleJoinByCode}>

						Join

					</button>

				</section>



				<section className="panel p-4">

					<h2 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>

						Public rooms

					</h2>

					{loading ? (

						<p style={{ color: "var(--text-secondary)" }}>Loading…</p>

					) : rooms.length === 0 ? (

						<p style={{ color: "var(--text-secondary)" }}>No public rooms open</p>

					) : (

						<ul className="flex flex-col gap-2">

							{rooms.map((r) => (

								<li

									key={r.roomid}

									className="flex justify-between items-center p-2 rounded border"

									style={{ borderColor: "var(--border-default)" }}

								>

									<div>

										<div className="font-medium" style={{ color: "var(--text-primary)" }}>

											{r.roomname ?? "Unnamed"}

										</div>

										<div className="text-xs" style={{ color: "var(--text-secondary)" }}>

											{r.language.toUpperCase()} · {r.connected_players}/{MAX_PLAYERS} ·{" "}

											{r.status}

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

