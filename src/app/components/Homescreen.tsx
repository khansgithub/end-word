"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { returnToFromSearchParams } from "@/app/lib/returnTo";
import { useUserStore } from "@/app/store/userStore";

export function Homescreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = returnToFromSearchParams(searchParams);
  const changeName = searchParams.get("changeName") === "1";
  const playerName = useUserStore((s) => s.playerName);
  const setName = useUserStore((s) => s.setName);

  useEffect(() => {
    if (changeName) {
      setName("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [changeName, setName]);

  function continueAfterName() {
    const name = inputRef.current?.value.trim();
    if (!name) return;
    setName(name);
    router.push(returnTo ?? "/lobby");
  }

  const heading = returnTo ? "Sign in to continue" : "End Word";
  const buttonLabel = returnTo ? "Continue" : "Go to lobby";

  return (
    <div
      className="flex flex-col w-full min-h-screen justify-center items-center p-3"
      style={{ background: "var(--bg-primary)" }}
    >
      <header className="w-full max-w-md mb-4 panel p-4">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          {heading}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {returnTo
            ? "Enter your name to return to the page you were viewing."
            : "Korean 끝말잇기 & English word chains"}
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
          defaultValue={changeName ? "" : playerName}
          className="input w-full mb-4"
          style={{
            background: "var(--input-bg-solid)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: "0.55rem",
            padding: "0.75rem",
          }}
          onKeyDown={(e) => e.key === "Enter" && continueAfterName()}
        />
        <button type="button" className="btn-fsm w-full" onClick={continueAfterName}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
