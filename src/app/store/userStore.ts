import { createStore } from "zustand";
import { persist } from "zustand/middleware";
import { ClientPlayerSocket } from "../../shared/types";

interface PlayerSession {
    playerName: string;
    clientId: string;
    setName: (name: string) => void;
}

interface Socket {
    socket: ClientPlayerSocket | null,
    setSocket: (socket: ClientPlayerSocket) => void;
}

const _userStore = (set: any) => ({
    playerName: "",
    clientId: crypto.randomUUID(),
    setName: (name: string) => set({ playerName: name }),
});

export const useUserStore = createStore<PlayerSession>()(
    // persist(_userStore, { name: "user-storage" });
    _userStore
);

export const useSocketStore = createStore<Socket>()(
    (set) => ({
        socket: null,
        setSocket: (socket) => set({ socket: socket })
    }),
)