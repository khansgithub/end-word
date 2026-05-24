"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useUserStore } from "@/app/store/userStore";

export function Homescreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const setName = useUserStore((s) => s.setName);

  function goToLobby() {
    const name = inputRef.current?.value.trim();
    if (!name) return;
    setName(name);
    router.push("/lobby");
  }

  return (
    <div
      className="flex flex-col w-full min-h-screen justify-center items-center p-3"
      style={{ background: "var(--bg-primary)" }}
    >
      <header className="w-full max-w-md mb-4 panel p-4">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          End Word
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Korean 끝말잇기 & English word chains
        </p>
      </header>

      <div className="panel w-full max-w-md p-6">
        <label className="label" htmlFor="name">
          <span className="label-text" style={{ color: "var(--text-primary)" }}>
            Your name
          </span>
        </label>
        <input
          ref={inputRef}
          id="name"
          type="text"
          placeholder="Enter your name"
          className="input w-full mb-4"
          style={{
            background: "var(--input-bg-solid)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: "0.55rem",
            padding: "0.75rem",
          }}
          onKeyDown={(e) => e.key === "Enter" && goToLobby()}
        />
        <button type="button" className="btn-fsm w-full" onClick={goToLobby}>
          Go to lobby
        </button>
      </div>
    </div>
  );
}
