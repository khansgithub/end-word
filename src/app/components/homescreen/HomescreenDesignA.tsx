"use client";

import { useHomescreenName } from "@/app/components/homescreen/useHomescreenName";

/** Design A — centered card, geometric sans, cool indigo accent */
export function HomescreenDesignA() {
  const {
    inputRef,
    continueAfterName,
    heading,
    buttonLabel,
    subtitle,
    returnTo,
    changeName,
    playerName,
  } = useHomescreenName();

  return (
    <div
      className="home-screen home-a flex min-h-dvh w-full flex-col items-center justify-center px-4 py-16"
      style={{ background: "var(--surface-base)" }}
    >
      <div
        className="card w-full max-w-sm border-0 shadow-none"
        style={{
          background: "var(--surface-card)",
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        <div className="card-body gap-8 p-8 sm:p-10">
          <header className="space-y-3">
            {!returnTo ? (
              <span
                className="inline-block text-[0.6875rem] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--accent)" }}
              >
                Word chains
              </span>
            ) : null}
            <h1
              className="text-[1.625rem] font-medium leading-tight tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {heading}
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {subtitle}
            </p>
          </header>

          <div className="space-y-5">
            <label className="form-control w-full gap-2" htmlFor="name-a">
              <span
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Your name
              </span>
              <input
                ref={inputRef}
                id="name-a"
                type="text"
                placeholder="Enter your name"
                defaultValue={changeName ? "" : playerName}
                autoComplete="nickname"
                className="home-input input input-bordered h-12 w-full rounded-lg border text-base"
                onKeyDown={(e) => e.key === "Enter" && continueAfterName()}
              />
            </label>

            <button
              type="button"
              className="home-btn btn h-12 min-h-12 w-full rounded-lg border-0 text-sm font-medium tracking-wide"
              onClick={continueAfterName}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
