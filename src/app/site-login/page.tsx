"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { returnToFromSearchParams } from "@/lib/client/ui/return-to";

function SiteLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = returnToFromSearchParams(searchParams) ?? "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/site-auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Incorrect password");
        return;
      }
      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col w-full min-h-screen justify-center items-center p-3"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="panel w-full max-w-md p-6">
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Site access
        </h1>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          This deployment is temporarily password-protected.
        </p>
        <form onSubmit={onSubmit}>
          <label className="label" htmlFor="site-password">
            <span className="label-text" style={{ color: "var(--text-primary)" }}>
              Password
            </span>
          </label>
          <input
            id="site-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input w-full mb-3"
            style={{
              background: "var(--input-bg-solid)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
              borderRadius: "0.55rem",
              padding: "0.75rem",
            }}
            required
          />
          {error ? (
            <p className="text-sm mb-3" style={{ color: "var(--status-error, #f87171)" }}>
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-fsm w-full" disabled={loading}>
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
