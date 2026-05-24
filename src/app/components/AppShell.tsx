"use client";

import { AppNav } from "@/app/components/AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
