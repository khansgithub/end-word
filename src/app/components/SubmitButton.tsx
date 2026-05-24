'use client';

import { gameStrings } from "@/app/lib/gameStrings";


interface SubmitButtonProps {
    onClick: () => void | Promise<void>;
    disabled: boolean;
    pending: boolean;
    opacity: number;
};

SubmitButton.displayName = 'SubmitButton';

export default function SubmitButton({ onClick, disabled, pending, opacity }: SubmitButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-busy={pending}
            className={`btn-fsm mt-4 px-6 py-3 text-base md:ml-18 inline-flex items-center justify-center gap-2 min-w-[10rem] ${pending ? "cursor-wait" : ""}`}
            style={{ opacity }}
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
