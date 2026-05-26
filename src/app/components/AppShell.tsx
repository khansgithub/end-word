"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/app/components/AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const showNav = pathname !== "/";

	return (
		<>
			<AppNav />
			<div className={`w-full flex flex-col items-center ${showNav ? "pt-14" : ""}`}>
				{children}
			</div>
		</>
	);
}
