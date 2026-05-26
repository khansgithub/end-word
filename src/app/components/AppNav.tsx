"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildLoginUrl } from "@/lib/client/ui/return-to";
import { useUserStore } from "@/app/store/userStore";

function navLinkClass(active: boolean): string {
	return `text-sm px-3 py-1.5 rounded-lg transition-colors duration-150 ${
		active ? "font-medium" : "opacity-70 hover:opacity-100"
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
	const lobbyHref = playerName ? "/lobby" : buildLoginUrl("/lobby");

	return (
		<nav
			className="fixed top-0 left-0 right-0 z-40 border-b backdrop-blur-sm"
			style={{
				backgroundColor: "color-mix(in srgb, var(--b-surface) 92%, transparent)",
				borderColor: "var(--b-surface-border)",
				fontFamily: "var(--font-b-sans)",
			}}
			aria-label="Main"
		>
			<div className="w-full max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-1">
					<Link href="/" className={navLinkClass(false)} style={{ color: "var(--b-fg)" }}>
						End Word
					</Link>
					<span style={{ color: "var(--b-muted)" }} aria-hidden>
						/
					</span>
					<Link href={lobbyHref} className={navLinkClass(onLobby)} style={{ color: "var(--b-fg)" }}>
						Lobby
					</Link>
					{onRoom && (
						<>
							<span style={{ color: "var(--b-muted)" }} aria-hidden>
								/
							</span>
							<span
								className="text-sm px-3 py-1.5 font-medium"
								style={{ color: "var(--b-fg)" }}
								aria-current="page"
							>
								Room
							</span>
						</>
					)}
				</div>
				<div className="flex items-center gap-3">
					{playerName && (
						<span className="text-sm truncate max-w-[10rem]" style={{ color: "var(--b-muted)" }}>
							{playerName}
						</span>
					)}
					{(onLobby || onRoom) && (
						<Link
							href={homeHref}
							className={navLinkClass(false)}
							style={{ color: "var(--b-muted)" }}
						>
							Change name
						</Link>
					)}
				</div>
			</div>
		</nav>
	);
}
