"use client";

import { gameStrings } from "@/lib/client/ui/game-strings";
import "./game-v2.css";

export interface SubmitButtonProps {
  onClick: () => void | Promise<void>;
  disabled: boolean;
  pending: boolean;
  opacity?: number;
}

/**
 * WIRE: same contract as `@/app/components/SubmitButton`.
 */
export default function SubmitButton({
  onClick,
  disabled,
  pending,
  opacity = 1,
}: SubmitButtonProps) {
  const isLocked = disabled || pending;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocked}
      aria-busy={pending}
      className="g2 g2-focus-ring w-full sm:w-auto min-w-[10rem] rounded-full px-5 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-[transform,opacity,box-shadow] disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        opacity,
        color: "var(--text-primary)",
        background: "var(--g2-accent)",
        boxShadow: isLocked ? "none" : "0 2px 12px var(--g2-accent-muted)",
      }}
    >
      {pending && (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      <span>{pending ? gameStrings.submitButtonPendingText : gameStrings.submitButtonText}</span>
    </button>
  );
}
