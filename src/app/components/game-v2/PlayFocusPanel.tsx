"use client";

import type { ReactNode } from "react";
import "./game-v2.css";

export interface PlayFocusPanelProps {
  status: ReactNode;
  input: ReactNode;
}

/** Primary play column: status grid + word input in one surface. */
export default function PlayFocusPanel({ status, input }: PlayFocusPanelProps) {
  return (
    <section className="g2 g2-panel flex flex-col gap-4 p-4 md:p-5 min-h-0">
      {status}
      {input}
    </section>
  );
}
