import { createStore } from "zustand";
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

export interface InputState {
    inputValue: string;
    highlightValue: string;
    isComposing: boolean;
    isError: boolean;
    lastKey: string;
    setInputValue: (value: string) => void;
    setHighlightValue: (value: string) => void;
    setIsComposing: (value: boolean) => void;
    setIsError: (value: boolean) => void;
    setLastKey: (value: string) => void;
    reset: () => void;
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