import { createStore } from "zustand";
import { persist } from "zustand/middleware";
import { ClientPlayerSocket } from "../../shared/types";

interface PlayerSession {
    playerName: string;
    playerId: string;
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
            playerId: crypto.randomUUID(),
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