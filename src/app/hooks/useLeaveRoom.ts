"use client";

import { leaveRoomApi } from "@/lib/client/api/room";
import { useEffect, useRef } from "react";
import { ConsoleTransport, LogLayer } from 'loglayer';

const L = "useLeaveRoom";
const logger = new LogLayer({
	transport: new ConsoleTransport({
		logger: console,
		enabled: process.env.NODE_ENV !== "production",
		appendObjectData: true
	})
}).withPrefix(L)
const CONNECTED = 0;

/** Module-level map so a remounted instance can cancel a pending leave
 *  scheduled by a previous (Strict Mode unmounted) instance. */
const pendingLeaves = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleLeave(roomId: string, delayMs: number): void {
	cancelPendingLeave(roomId);
	pendingLeaves.set(
		roomId,
		setTimeout(() => {
			pendingLeaves.delete(roomId);
			logger.withMetadata({ roomId }).info("delayed leave executing");
			void leaveRoomApi(roomId);
		}, delayMs),
	);
}

function cancelPendingLeave(roomId: string): void {
	const existing = pendingLeaves.get(roomId);
	if (existing) {
		clearTimeout(existing);
		pendingLeaves.delete(roomId);
		logger.withMetadata({ roomId }).debug("cancelled pending leave");
	}
}

export function useLeaveRoom(roomId: string, connection: number) {
	const leaveContextRef = useRef({ roomId, connected: false });

	logger.withMetadata({ roomId, connection }).debug("mount");

	// Must run first so the navigation-away cleanup (which reads this ref)
	// sees the latest roomId/connected values.
	useEffect(() => {
		leaveContextRef.current = { roomId, connected: connection === CONNECTED };
		logger.withMetadata({ roomId, connected: connection === CONNECTED }).debug("context updated");
	});

	useEffect(() => {
		if (connection !== CONNECTED) {
			logger.debug("not connected, skipping pagehide listener");
			return;
		}

		const leaveOnUnload = () => {
			logger.withMetadata({ roomId }).info("pagehide: leaving room");
			void leaveRoomApi(roomId);
		};

		window.addEventListener("pagehide", leaveOnUnload);
		return () => {
			logger.debug("removing pagehide listener");
			window.removeEventListener("pagehide", leaveOnUnload);
		};
	}, [roomId, connection]);

	// Cancel any pending leave from a previous (Strict Mode unmounted) instance.
	// This runs synchronously on mount before any async timeout can fire.
	useEffect(() => {
		cancelPendingLeave(roomId);
	}, [roomId]);

	// Navigation away — schedules a delayed leave. If the component
	// remounts (Strict Mode), the mount effect above cancels it.
	useEffect(() => {
		return () => {
			const { roomId: id, connected } = leaveContextRef.current;
			if (!connected) {
				logger.debug("cleanup: not connected, skipping leave");
				return;
			}

			logger.withMetadata({ roomId: id }).debug("scheduling delayed leave (Strict Mode debounce)");
			scheduleLeave(id, 100);
		};
	}, []);
}
