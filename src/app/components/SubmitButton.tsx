'use client';

import { forwardRef } from "react";

interface SubmitButtonProps {
    onClick: (...args: any[]) => void;
    disabled: boolean;
    opacity: number;
};

SubmitButton.displayName = 'SubmitButton';

export default function SubmitButton({ onClick, disabled, opacity }: SubmitButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="btn-fsm mt-4 px-6 py-3 text-base"
            style={{ opacity }}
        >
            <span>▶ Submit Word</span>
        </button>
    );
}