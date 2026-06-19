"use client";

import { leaveRoomApi } from "@/lib/client/api/room";
import { useEffect, useRef } from "react";
import { logger } from "@/lib/client/logging";

const L = "useLeaveRoom";
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
      logger.info(L, "delayed leave executing", { roomId });
      void leaveRoomApi(roomId);
    }, delayMs),
  );
}

function cancelPendingLeave(roomId: string): void {
  const existing = pendingLeaves.get(roomId);
  if (existing) {
    clearTimeout(existing);
    pendingLeaves.delete(roomId);
    logger.debug(L, "cancelled pending leave", { roomId });
  }
}

export function useLeaveRoom(roomId: string, connection: number) {
    const leaveContextRef = useRef({ roomId, connected: false });

    logger.debug(L, "mount", { roomId, connection });

    // Must run first so the navigation-away cleanup (which reads this ref)
    // sees the latest roomId/connected values.
    useEffect(() => {
        leaveContextRef.current = { roomId, connected: connection === CONNECTED };
        logger.debug(L, "context updated", { roomId, connected: connection === CONNECTED });
    });

    useEffect(() => {
        if (connection !== CONNECTED) {
            logger.debug(L, "not connected, skipping pagehide listener");
            return;
        }

        const leaveOnUnload = () => {
            logger.info(L, "pagehide: leaving room", { roomId });
            void leaveRoomApi(roomId);
        };

        window.addEventListener("pagehide", leaveOnUnload);
        return () => {
            logger.debug(L, "removing pagehide listener");
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
                logger.debug(L, "cleanup: not connected, skipping leave");
                return;
            }

            logger.debug(L, "scheduling delayed leave (Strict Mode debounce)", { roomId: id });
            scheduleLeave(id, 100);
        };
    }, []);
}
