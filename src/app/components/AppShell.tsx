"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/app/components/AppNav";
import { SITE_LOGIN_PATH } from "@/lib/site-lock";

export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isStandaloneScreen = pathname === "/" || pathname === SITE_LOGIN_PATH;
	const showNav = !isStandaloneScreen;

	return (
		<>
			{showNav ? <AppNav /> : null}
			<div className={`w-full flex flex-col items-center ${showNav ? "pt-14" : ""}`}>
				{children}
			</div>
		</>
	);
}
