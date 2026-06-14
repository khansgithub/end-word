"use client";

import { leaveRoomApi } from "@/lib/client/api/room";
import { useEffect, useRef } from "react";

const CONNECTED = 0;

export function useLeaveRoom(roomId: string, connection: number) {
    const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const leaveContextRef = useRef({ roomId, connected: false });

    // Must run first so the navigation-away cleanup (which reads this ref)
    // sees the latest roomId/connected values.
    useEffect(() => {
        leaveContextRef.current = { roomId, connected: connection === CONNECTED };
    });

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

    // Navigation away — debounced to ignore React Strict Mode remounts.
    useEffect(() => {
        return () => {
            const { roomId: id, connected } = leaveContextRef.current;
            if (!connected) return;

            leaveTimeoutRef.current = setTimeout(() => {
                void leaveRoomApi(id);
            }, 100);
        };
    }, []);

    // Cancel a pending leave from Strict Mode's dev-only remount cycle.
    useEffect(() => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }
    }, []);
}
