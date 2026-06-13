"use client";

import { RELEASE_VERSION } from "@/lib/app-version";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { returnToFromSearchParams } from "@/lib/client/ui/return-to";
import { useUserStore } from "@/app/store/userStore";

export function Homescreen() {
    const {
        inputRef,
        continueAfterName,
        heading,
        buttonLabel,
        subtitle,
        changeName,
        playerName,
    } = useHomescreenName();

    return (
        <div
            className="app-ui flex min-h-dvh w-full flex-col items-center justify-center px-5 py-12"
            style={{
                background: "var(--b-bg)",
                color: "var(--b-fg)",
                fontFamily: "var(--font-b-sans)",
            }}
        >
            <div className="flex w-full max-w-md flex-col gap-8">
                <header className="space-y-4 text-center">
                    <div className="flex justify-center">
                        <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide"
                            style={{
                                background: "var(--b-accent-muted)",
                                color: "var(--b-accent)",
                            }}
                        >
                            {RELEASE_VERSION}
                        </span>
                    </div>
                    <h1
                        className="text-[2.25rem] font-normal leading-[1.05] tracking-[-0.02em] sm:text-4xl"
                        style={{ fontFamily: "var(--font-b-display)" }}
                    >
                        {heading}
                    </h1>
                    <p
                        className="mx-auto max-w-xs text-[0.9375rem] leading-relaxed sm:max-w-sm"
                        style={{ color: "var(--b-muted)" }}
                    >
                        {subtitle}
                    </p>
                </header>

                <form
                    className="rounded-2xl border p-6 sm:p-7"
                    style={{
                        background: "var(--b-surface)",
                        borderColor: "var(--b-surface-border)",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                    }}
                    onSubmit={(e) => {
                        e.preventDefault();
                        continueAfterName();
                    }}
                >
                    <label
                        className="form-control w-full gap-2"
                        htmlFor="name-b"
                    >
                        <span
                            className="text-center text-xs font-medium"
                            style={{ color: "var(--b-muted)" }}
                        >
                            Your name
                        </span>
                        <input
                            ref={inputRef}
                            id="name-b"
                            type="text"
                            placeholder="Enter your name"
                            defaultValue={changeName ? "" : playerName}
                            autoComplete="nickname"
                            className="app-input input input-bordered h-12 w-full rounded-xl border text-base"
                            onKeyDown={(e) =>
                                e.key === "Enter" && continueAfterName()
                            }
                        />
                    </label>

                    <button
                        type="submit"
                        className="app-btn btn mt-5 h-12 min-h-12 w-full rounded-xl border-0 text-sm font-medium"
                    >
                        {buttonLabel}
                    </button>
                </form>
            </div>
        </div>
    );
}

function useHomescreenName() {
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
