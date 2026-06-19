"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/app/components/AppNav";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { SITE_LOGIN_PATH } from "@/shared/site-lock";

export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isStandaloneScreen = pathname === "/" || pathname === SITE_LOGIN_PATH;
	const onRoom = pathname.startsWith("/room/");
	const showNav = !isStandaloneScreen;

	return (
		<>
			{showNav && !onRoom && <AppNav />}
			{showNav && onRoom && <div className="hidden sm:block"><AppNav /></div>}
			{isStandaloneScreen && (
				<div className="fixed top-4 right-4 z-50">
					<ThemeToggle />
				</div>
			)}
			<div className={`w-full flex flex-col items-center ${showNav && !onRoom ? "pt-12 sm:pt-14" : showNav && onRoom ? "sm:pt-12 sm:pt-14" : ""}`}>
				{children}
			</div>
		</>
	);
}
