import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PlayerSession {
  playerName: string;
  clientId: string;
  setName: (name: string) => void;
}

export const useUserStore = create<PlayerSession>()(
  persist(
    (set) => ({
      playerName: "",
      clientId: crypto.randomUUID(),
      setName: (name: string) => set({ playerName: name }),
    }),
    { name: "user-storage" }
  )
);

/** @deprecated Socket.IO removed; stub for legacy imports */
export const useSocketStore = {
  getState: () => ({ socket: null as null, setSocket: (_s: unknown) => {} }),
};

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
