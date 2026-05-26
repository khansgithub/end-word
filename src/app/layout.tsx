import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Fraunces, IBM_Plex_Sans } from "next/font/google";
import "@/app/globals.css";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { AppShell } from "@/app/components/AppShell";
import { SupabaseProvider } from "@/app/components/SupabaseProvider";

const appSans = DM_Sans({
    variable: "--font-app-sans",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

const appMono = DM_Mono({
    variable: "--font-app-mono",
    subsets: ["latin"],
    weight: ["400", "500"],
});

/** Design B display + UI sans */
const designBDisplay = Fraunces({
    variable: "--font-b-display",
    subsets: ["latin"],
    weight: ["400", "500", "600"],
});

const designBSans = IBM_Plex_Sans({
    variable: "--font-b-sans",
    subsets: ["latin"],
    weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
    title: "End Word",
    description: "Multiplayer word chain game (끝말잇기 / English)",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </head>
            <body className={
                `${appSans.variable} ${appMono.variable} ${designBDisplay.variable} ${designBSans.variable} antialiased w-dvw min-h-screen p-0 m-0`
            } style={{ backgroundColor: "var(--b-bg)", color: "var(--b-fg)" }}>
                <ThemeToggle />
                <main className="w-full min-h-dvh flex flex-col items-center">
                    <SupabaseProvider>
                        <AppShell>{children}</AppShell>
                    </SupabaseProvider>
                </main>
            </body>
        </html>
    );
}
