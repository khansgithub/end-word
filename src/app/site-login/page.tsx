"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { returnToFromSearchParams } from "@/lib/client/ui/return-to";
import { RELEASE_VERSION } from "@/lib/app-version";

function SiteLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = returnToFromSearchParams(searchParams) ?? "/";
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(event: React.FormEvent) {
        event.preventDefault();
        console.log(`[siteLogin] onSubmit returnTo=${returnTo}`);
        setError(null);
        setLoading(true);
        try {
            console.log(`[siteLogin] POST /api/site-auth (password length=${password.length})`);
            const res = await fetch("/api/site-auth", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ password }),
            });
            console.log(`[siteLogin] response status=${res.status} ${res.statusText}`);
            if (!res.ok) {
                console.log("[siteLogin] incorrect password");
                setError("Incorrect password");
                return;
            }
            console.log(`[siteLogin] redirecting to returnTo=${returnTo}`);
            router.replace(returnTo);
        } catch (e) {
            console.error("[siteLogin] fetch error", e);
            setError("Something went wrong. Try again.");
        } finally {
            console.log("[siteLogin] loading done");
            setLoading(false);
        }
    }

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
                        className="text-[2rem] font-normal leading-tight tracking-tight sm:text-4xl"
                        style={{ fontFamily: "var(--font-b-display)" }}
                    >
                        Site access
                    </h1>
                    <p
                        className="mx-auto max-w-sm text-sm leading-relaxed"
                        style={{ color: "var(--b-muted)" }}
                    >
                        This deployment is temporarily password-protected.
                    </p>
                </header>

                <form
                    className="rounded-2xl border p-6 sm:p-7"
                    style={{
                        background: "var(--b-surface)",
                        borderColor: "var(--b-surface-border)",
                        boxShadow: "var(--b-shadow-elevated)",
                    }}
                    onSubmit={onSubmit}
                >
                    <label
                        className="form-control w-full gap-2"
                        htmlFor="site-password"
                    >
                        <span
                            className="text-xs font-medium"
                            style={{ color: "var(--b-muted)" }}
                        >
                            Password
                        </span>
                        <input
                            id="site-password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="app-input input input-bordered h-12 w-full rounded-xl border text-base"
                            required
                        />
                    </label>
                    {error ? (
                        <p
                            className="mt-3 text-sm"
                            style={{ color: "var(--b-danger)" }}
                        >
                            {error}
                        </p>
                    ) : null}
                    <button
                        type="submit"
                        className="app-btn btn mt-5 h-12 min-h-12 w-full rounded-xl border-0 text-sm font-medium"
                        disabled={loading}
                    >
                        {loading ? "Checking…" : "Enter"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function SiteLoginPage() {
    return (
        <Suspense fallback={null}>
            <SiteLoginForm />
        </Suspense>
    );
}
