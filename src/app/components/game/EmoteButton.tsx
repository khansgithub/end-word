"use client";

export interface EmoteButtonProps {
  onClick: () => void;
  disabled: boolean;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export default function EmoteButton({ onClick, disabled, buttonRef }: EmoteButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="g2-emote-toggle"
      onClick={onClick}
      disabled={disabled}
      aria-label="Open emote picker"
      title="Send emote"
    >
      <svg
        className="g2-emote-toggle-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none" />
        <path d="M8 14c0 0 1.5 3 4 3s4-3 4-3" />
      </svg>
    </button>
  );
}
