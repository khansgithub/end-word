import { create } from "zustand";
// import { persist } from "zustand/middleware";

interface PlayerName {
    playerName: string;
    setName: (name: string) => void;
}

export const useUserStore = create<PlayerName>()(
    // persist(
        (set) => ({
            playerName: "Player",
            setName: (name: string) => set({ playerName: name }),
        }),
        // {
        //     name: "user-storage",
        // }
    // )
);