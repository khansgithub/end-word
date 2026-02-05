'use client';

import { gameStrings } from "./gameStrings";


interface SubmitButtonProps {
    onClick: (...args: any[]) => void;
    disabled: boolean;
    opacity: number;
};

SubmitButton.displayName = 'SubmitButton';

export default function SubmitButton({ onClick, disabled, opacity }: SubmitButtonProps) {
    // hardcoded left margin to match the position of the input box.
    // takes witdh of the key display (w-16) + gap (gap-2)
    const leftMargin = "calc(var(--spacing) * 16 + var(--spacing) * 2)";

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="btn-fsm mt-4 px-6 py-3 text-base"
            style={{ opacity, marginLeft: leftMargin }}
        >
            <span>{gameStrings.submitButtonText}</span>
        </button>
    );
}