"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { returnToFromSearchParams } from "@/lib/client/ui/return-to";
import { useUserStore } from "@/app/store/userStore";

export function useHomescreenName() {
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
  const subtitle = returnTo
    ? "Enter your name to return to the page you were viewing."
    : "Korean 끝말잇기 & English word chains";

  return {
    inputRef,
    continueAfterName,
    heading,
    buttonLabel,
    subtitle,
    returnTo,
    changeName,
    playerName,
  };
}
