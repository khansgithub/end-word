"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/app/store/userStore";

function navLinkClass(active: boolean): string {
  return `text-sm px-3 py-1.5 rounded-md transition-opacity ${
    active ? "opacity-100 font-medium" : "opacity-70 hover:opacity-100"
  }`;
}

export function AppNav() {
  const pathname = usePathname();
  const playerName = useUserStore((s) => s.playerName);

  const onHome = pathname === "/";
  const onLobby = pathname === "/lobby";
  const onRoom = pathname.startsWith("/room/");

  if (onHome) return null;

  const homeHref = playerName && (onLobby || onRoom) ? "/?changeName=1" : "/";

  return (
    <nav
      className="w-full max-w-4xl mx-auto px-4 pt-4 flex flex-wrap items-center justify-between gap-2"
      aria-label="Main"
    >
      <div className="flex items-center gap-1">
        <Link
          href="/"
          className={navLinkClass(false)}
          style={{ color: "var(--text-primary)" }}
        >
          End Word
        </Link>
        <span style={{ color: "var(--text-secondary)" }} aria-hidden>
          /
        </span>
        <Link
          href="/lobby"
          className={navLinkClass(onLobby)}
          style={{ color: "var(--text-primary)" }}
        >
          Lobby
        </Link>
        {onRoom && (
          <>
            <span style={{ color: "var(--text-secondary)" }} aria-hidden>
              /
            </span>
            <span
              className="text-sm px-3 py-1.5 font-medium"
              style={{ color: "var(--text-primary)" }}
              aria-current="page"
            >
              Room
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {playerName && (
          <span className="text-sm truncate max-w-[10rem]" style={{ color: "var(--text-secondary)" }}>
            {playerName}
          </span>
        )}
        {(onLobby || onRoom) && (
          <Link
            href={homeHref}
            className={navLinkClass(false)}
            style={{ color: "var(--text-secondary)" }}
          >
            Change name
          </Link>
        )}
      </div>
    </nav>
  );
}
