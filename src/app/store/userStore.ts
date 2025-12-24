import { createStore } from "zustand";
import { ClientPlayerSocket } from "../../shared/types";
import { io } from "socket.io-client";
import { persist } from "zustand/middleware";

interface PlayerSession {
    playerName: string;
    id: string;
    setName: (name: string) => void;
}

interface Socket{
    socket: ClientPlayerSocket | null,
    setSocket: (socket: ClientPlayerSocket) => void;
}

export const useUserStore = createStore<PlayerSession>()(
    persist(
        (set) => ({
            playerName: "",
            id: crypto.randomUUID(),
            setName: (name: string) => set({ playerName: name }),
        }),
        
        {
            name: "user-storage",
        }
    )
);

export const useSocketStore = createStore<Socket>()(
    (set) => ({
        socket: null,
        setSocket: (socket) => set({socket: socket})
    }),    
)