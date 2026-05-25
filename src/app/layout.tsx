import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { AppShell } from "@/app/components/AppShell";
import { SupabaseProvider } from "@/app/components/SupabaseProvider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
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
                `${geistSans.variable} ${geistMono.variable} antialiased w-dvw min-h-screen p-0 m-0`
            } style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
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
