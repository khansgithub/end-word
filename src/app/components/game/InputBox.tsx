"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { create } from "zustand";
import { ENGLISH_MIN_WORD_LENGTH } from "@/shared/consts";
import { MatchLetter } from "@/shared/types";
import { InputState } from "@/app/store/userStore";
import {
    blockInput as _blockInput,
    clearInput as _clearInput,
    continueInput as _continueInput,
    actionHandlers as validateWrapper
} from "@/lib/client/game/input-validation";
import { gameStrings } from "@/lib/client/ui/game-strings";
import { IconLock } from "@/app/components/icons";

// Zustand store for input state to minimize re-renders
const useInputStore = create<InputState>((set) => ({
    inputValue: "",
    highlightValue: "",
    isComposing: false,
    isError: false,
    errorMessage: null as string | null,
    errorShakeTick: 0,
    lastKey: "",
    setInputValue: (value: string) =>
        set((state) => (state.inputValue === value ? state : { inputValue: value })),
    setHighlightValue: (value: string) =>
        set((state) => (state.highlightValue === value ? state : { highlightValue: value })),
    setIsComposing: (value: boolean) =>
        set((state) => (state.isComposing === value ? state : { isComposing: value })),
    setIsError: (value: boolean) =>
        set((state) => (state.isError === value ? state : { isError: value })),
    setErrorMessage: (value: string | null) =>
        set((state) => (state.errorMessage === value ? state : { errorMessage: value })),
    bumpErrorShake: () => set((state) => ({ errorShakeTick: state.errorShakeTick + 1 })),
    setLastKey: (value: string) =>
        set((state) => (state.lastKey === value ? state : { lastKey: value })),
    reset: () => set({
        inputValue: "",
        highlightValue: "",
        isComposing: false,
        isError: false,
        errorMessage: null,
        errorShakeTick: 0,
        lastKey: ""
    }),
}));

let focusInputCallback: (() => void) | null = null;

export const focusInputBox = () => {
    focusInputCallback?.();
};

/**
/**
 * InputBox Zustand State & Props Documentation
 *
 * Zustand store state:
 * - inputValue:      The current user input in the actual <input> field. Updated when the user types.
 * - highlightValue:  The text currently shown in the "highlight" overlay input, typically the match letter (or composition fragment).
 * - isComposing:     Whether the user is currently using IME/composition (e.g. Hangul typing).
 * - isError:         True if the current input is considered invalid by validation logic; used for error highlighting.
 * - lastKey:         The last character or key input detected (used for UI/animation feedback, not always needed by parent).
 * - setInputValue:       Setter to update inputValue.
 * - setHighlightValue:   Setter to update highlightValue.
 * - setIsComposing:      Setter to update isComposing.
 * - setIsError:          Setter to update isError.
 * - setLastKey:          Setter to update lastKey.
 * - reset:               Resets all tracked input state to defaults.
 *
 * Props on InputBox:
 * - matchLetter:         The current MatchLetter object (with `.steps[]` for composite Hangul etc.) for input guidance and validation.
 * - disabled:            Whether the input is visually/functionally disabled (prevents typing, changes appearance).
 * - onSubmit:            Called with completed input when "Enter" is pressed and the input is non-empty (required).
 *
 * InputBox uses two overlapping input layers:
 * - The "highlight" layer is an input with aria-hidden="true" that displays the expected initial match (usually matchLetter.steps[0]).
 *   It updates via highlightValue, usually immediately when matchLetter changes, or during composition.
 * - The actual user-editable input is above the highlight and receives keyboard/composition input.
 *   React/Zustand keep all state and error feedback in sync; handlers for onChange, onComposition events, and onKeyDown update global state.
 *
 * This documentation is accurate as of 2024-06: All state and prop references are up-to-date with the latest implementation.
 */

interface InputBoxProps {
    matchLetter: MatchLetter;
    disabled: boolean;
    pending?: boolean;
    onSubmit: () => void | Promise<void>;
    language?: "en" | "ko";
}

function InputBox({
    matchLetter,
    disabled,
    pending = false,
    onSubmit,
    language = "ko",
}: InputBoxProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const caretMirrorRef = useRef<HTMLDivElement>(null);
    const caretMeasureRef = useRef<HTMLSpanElement>(null);
    const prevInputRef = useRef<string>("");
    const prevDisabledRef = useRef(disabled);

    const [isFocused, setIsFocused] = useState(false);
    const [caretX, setCaretX] = useState(0);

    // Zustand selectors - only re-render when specific values change
    const inputValue = useInputStore((state) => state.inputValue);
    const highlightValue = useInputStore((state) => state.highlightValue);
    const isError = useInputStore((state) => state.isError);
    const errorMessage = useInputStore((state) => state.errorMessage);
    const errorShakeTick = useInputStore((state) => state.errorShakeTick);
    const isComposing = useInputStore((state) => state.isComposing);
    const lastKey = useInputStore((state) => state.lastKey);

    const [isShaking, setIsShaking] = useState(false);

    useEffect(() => {
        if (errorShakeTick === 0) return;
        setIsShaking(true);
        const timer = window.setTimeout(() => setIsShaking(false), 450);
        return () => window.clearTimeout(timer);
    }, [errorShakeTick]);

    const matchBlock = matchLetter.block;
    const firstStep = matchLetter.steps[0] ?? "";

    // Reset highlight when the match letter block changes (new turn) or input is cleared
    // (e.g. after a successful submit). Depend on primitives — parent re-renders often pass
    // a new matchLetter object reference.
    useEffect(() => {
        if (!firstStep) return;

        const store = useInputStore.getState();
        if (store.inputValue !== "" || store.highlightValue === firstStep) return;

        store.setHighlightValue(firstStep);
    }, [matchBlock, firstStep, inputValue]);

    const maxLength = language === "en" ? 20 : 7;
    const minLength = language === "en" ? ENGLISH_MIN_WORD_LENGTH : 2;

    useEffect(() => {
        focusInputCallback = () => {
            const input = inputRef.current;
            if (input && !input.disabled) {
                input.focus();
            }
        };
        if (!disabled) {
            inputRef.current?.focus();
        }
        return () => {
            focusInputCallback = null;
        };
    }, []);

    useEffect(() => {
        if (prevDisabledRef.current && !disabled) {
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
        prevDisabledRef.current = disabled;
    }, [disabled]);

    // Helper functions for input manipulation
    const clearInput = useCallback(
        () => _clearInput(useInputStore, prevInputRef, matchLetter), [matchLetter.steps]);

    const blockInput = useCallback(
        () => _blockInput(useInputStore, prevInputRef), []);

    const continueInput = useCallback(
        (input: string) => _continueInput(useInputStore, prevInputRef, matchLetter, input), [matchLetter]);

    const validateInput = useCallback((
        input: string,
        prev: string,
        letter: string,
        composing: boolean
    ): void => {
        validateWrapper(
            input,
            prev,
            letter,
            composing,
            matchLetter,
            clearInput,
            blockInput,
            continueInput
        );
    }, [matchLetter]);

    const updateCaretPosition = useCallback(() => {
        const input = inputRef.current;
        const mirror = caretMirrorRef.current;
        const measure = caretMeasureRef.current;
        if (!input || !mirror || !measure) return;

        const computed = window.getComputedStyle(input);
        mirror.style.font = computed.font;
        mirror.style.letterSpacing = computed.letterSpacing;
        mirror.style.padding = computed.padding;
        mirror.style.boxSizing = computed.boxSizing;

        const caretIndex = input.selectionStart ?? input.value.length;
        const textBeforeCaret = input.value.substring(0, caretIndex);
        measure.textContent = textBeforeCaret || "\u200b";

        const padLeft = Number.parseFloat(computed.paddingLeft) || 0;
        setCaretX(measure.offsetWidth + padLeft - input.scrollLeft);
    }, []);

    useEffect(() => {
        updateCaretPosition();
    }, [inputValue, updateCaretPosition]);

    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        const onCaretMove = () => updateCaretPosition();
        input.addEventListener("select", onCaretMove);
        input.addEventListener("keyup", onCaretMove);
        input.addEventListener("click", onCaretMove);
        window.addEventListener("resize", onCaretMove);

        return () => {
            input.removeEventListener("select", onCaretMove);
            input.removeEventListener("keyup", onCaretMove);
            input.removeEventListener("click", onCaretMove);
            window.removeEventListener("resize", onCaretMove);
        };
    }, [updateCaretPosition]);

    // Event handlers
    const handleCompositionStart = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
        // console.log("IME composition started");
        useInputStore.getState().setIsComposing(true);
    }, []);

    const handleCompositionUpdate = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
        const fragment = e.data ?? "";
        if (fragment) {
            useInputStore.getState().setLastKey(fragment.slice(-1));
        }
        requestAnimationFrame(updateCaretPosition);
    }, [updateCaretPosition]);

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
        // console.log("IME composition ended");
        useInputStore.getState().setIsComposing(false);

        const input = e.currentTarget.value;
        const prev = prevInputRef.current;
        const letter = ""; // No letter detail from IME composition end

        // console.clear();
        // console.log("--------------");
        // console.log("(onCompositionEnd) input:", input);
        // console.log("prev input:", prev);
        // console.log("composition state:", false);
        // console.log("--------------");

        validateInput(input, prev, letter, false);
    }, [validateInput]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const event = e.nativeEvent as any as InputEvent;
        const letter = event.data ?? ""; // can be null for delete
        const input = e.currentTarget.value;
        const prev = prevInputRef.current;
        const store = useInputStore.getState();

        // Clear error state when user starts typing
        if (isError) {
            store.setIsError(false);
            store.setErrorMessage(null);
        }

        // console.clear();
        // console.log("--------------");
        // console.log("input:", input, "letter:", letter);
        // console.log("prev input:", prevInputRef.current);
        // console.log("composition state:", isComposing);
        // console.log("--------------");

        store.setLastKey(letter.slice(-1));

        validateInput(input, prev, letter, isComposing);
        requestAnimationFrame(updateCaretPosition);
    }, [isComposing, isError, validateInput, language, updateCaretPosition]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (disabled) return;

        if (e.repeat) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();

            if (onSubmit && inputValue) {
                void onSubmit();
            }
            return;
        }
        if (e.key === "Backspace" && inputValue === "") {
            useInputStore.getState().setLastKey("");
        }
    }, [disabled, inputValue, onSubmit]);

    const handleBeforeInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
        // console.log("before input: ", e.data);
    }, []);

    // Shared base classes for both input elements
    const sharedInputClasses = "col-start-1 row-start-1 md:w-full md:h-20 md:text-5xl rounded-[0.55rem] font-mono outline-none transition-all duration-200 ease-in-out py-[0.7rem] px-[0.75rem]";

    const lastKeyBoxStyle = {
        borderColor: "var(--border-default)",
        background: "var(--gradient-input)",
        color: "var(--text-primary)",
    } as const;

    // KO only: show hover feedback while entering the first character
    const showLastKeyHover =
        language === "ko" &&
        isFocused &&
        (inputValue.length === 0 ||
            (inputValue.length === 1 && isComposing));

    return (
        <div className="relative w-full">
            <div className={`form-control md:w-full ${isShaking ? "animate-shake" : ""}`}>
                <div className="grid grid-cols-1 grid-rows-1 relative md:w-full overflow-visible">
                    {/* Invisible mirror for caret X measurement (same typography as inputs) */}
                    <div
                        ref={caretMirrorRef}
                        className={`${sharedInputClasses} col-start-1 row-start-1 invisible pointer-events-none whitespace-pre border-0`}
                        aria-hidden
                    >
                        <span ref={caretMeasureRef} />
                    </div>

                    {showLastKeyHover && (
                        <motion.div
                            className="hidden md:flex absolute z-30 pointer-events-none justify-center items-center w-16 h-16 rounded-lg border text-4xl font-bold -translate-x-1/2"
                            style={{
                                ...lastKeyBoxStyle,
                                bottom: "calc(100% + 12px)",
                            }}
                            initial={false}
                            animate={{ left: caretX }}
                            transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.65 }}
                            aria-hidden={!lastKey}
                        >
                            <p>{lastKey}</p>
                        </motion.div>
                    )}

                    {/* Highlight layer - shows the match letter */}
                    <input
                        type="text"
                        disabled={true}
                        readOnly
                        value={highlightValue}
                        className={`${sharedInputClasses} inset-0 pointer-events-none select-none border-transparent border`}
                        style={{
                            background: 'var(--gradient-input)',
                            color: disabled ? 'var(--input-text-disabled)' : 'var(--b-accent)',
                            boxShadow: 'inset 0 0 0 1px var(--input-box-shadow)',
                            opacity: disabled ? 0.4 : 1,
                        }}
                        aria-hidden="true"
                    />
                    {/* Actual input layer */}
                    <input
                        ref={inputRef}
                        type="text"
                        disabled={disabled}
                        maxLength={maxLength}
                        minLength={minLength}
                        value={inputValue}
                        onChange={handleChange}
                        onCompositionStart={handleCompositionStart}
                        onCompositionUpdate={handleCompositionUpdate}
                        onCompositionEnd={handleCompositionEnd}
                        onBeforeInput={handleBeforeInput}
                        onKeyDown={handleKeyDown}
                        className={`${sharedInputClasses} background-transparent z-10 border disabled:cursor-not-allowed disabled:opacity-70`}
                        style={{
                            borderColor: disabled
                                ? 'var(--input-border-disabled)'
                                : isError
                                    ? 'var(--input-border-error)'
                                    : 'var(--input-border-default)',
                            color: disabled ? 'var(--input-text-disabled)' : 'var(--text-primary)',
                            caretColor: disabled ? 'transparent' : 'var(--b-accent)',
                            boxShadow: 'inset 0 0 0 1px var(--input-box-shadow)',
                        }}
                        onFocus={(e) => {
                            if (disabled) return;
                            setIsFocused(true);
                            requestAnimationFrame(updateCaretPosition);
                            if (!isError) {
                                e.currentTarget.style.borderColor = "var(--b-accent)";
                                e.currentTarget.style.boxShadow = "var(--b-ring-focus)";
                            } else {
                                e.currentTarget.style.borderColor = "var(--input-border-error)";
                                e.currentTarget.style.boxShadow = "var(--b-ring-focus)";
                            }
                        }}
                        onBlur={(e) => {
                            if (disabled) return;
                            setIsFocused(false);
                            e.currentTarget.style.borderColor = isError
                                ? "var(--input-border-error)"
                                : "var(--input-border-default)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />
                    {/* Disabled overlay with lock icon */}
                    {disabled && (
                        <div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                            style={{
                                background: 'var(--input-overlay-disabled)',
                                borderRadius: '0.55rem',
                            }}
                        >
                            <div className="flex flex-col items-center gap-1">
                                {pending ? (
                                    <span
                                        className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
                                        style={{ color: "var(--input-text-disabled)" }}
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <IconLock
                                        width={24}
                                        height={24}
                                        style={{ color: "var(--input-text-disabled)" }}
                                    />
                                )}
                                <span
                                    className="text-xs font-medium"
                                    style={{ color: 'var(--input-text-disabled)' }}
                                >
                                    {pending ? gameStrings.inputPendingText : gameStrings.inputDisabledText}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                {isError && !disabled && (
                    <label className="label py-1">
                        <span className="label-text-alt" style={{ color: 'var(--text-error)', fontSize: '0.7rem' }}>
                            {errorMessage ?? gameStrings.inputInvalidText}
                        </span>
                    </label>
                )}
            </div>
        </div>
    );
}

// Export a hook to access the input store from outside
export const useInputBoxStore = () => useInputStore;

// Export a function to get the current input value (for submission)
export const getInputValue = () => useInputStore.getState().inputValue;

// Export a function to set error state (for submission validation)
export const setInputError = (error: boolean, message?: string) => {
    const store = useInputStore.getState();
    store.setIsError(error);
    if (error) {
        store.setErrorMessage(message ?? null);
        store.bumpErrorShake();
    } else {
        store.setErrorMessage(null);
    }
};

// Export a function to reset the input
export const resetInput = () => {
    useInputStore.getState().reset();
};

export default memo(InputBox);

