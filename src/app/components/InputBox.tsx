"use client";

import React, { memo, useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { MatchLetter } from "../../shared/types";
import { InputState } from "../store/userStore";
import {
    blockInput as _blockInput,
    clearInput as _clearInput,
    continueInput as _continueInput,
    actionHandlers as validateWrapper
} from "./inputValidation";
import { gameStrings } from "./gameStrings";

// Zustand store for input state to minimize re-renders
const useInputStore = create<InputState>((set) => ({
    inputValue: "",
    highlightValue: "",
    isComposing: false,
    isError: false,
    lastKey: "",
    setInputValue: (value: string) => set({ inputValue: value }),
    setHighlightValue: (value: string) => set({ highlightValue: value }),
    setIsComposing: (value: boolean) => set({ isComposing: value }),
    setIsError: (value: boolean) => set({ isError: value }),
    setLastKey: (value: string) => set({ lastKey: value }),
    reset: () => set({
        inputValue: "",
        highlightValue: "",
        isComposing: false,
        isError: false,
        lastKey: ""
    }),
}));

/**
 * InputBox Zustand State & Props Documentation
 * 
 * Zustand store state:
 * - inputValue:      The current user input in the actual <input> field. Updated on user typing.
 * - highlightValue:  The text shown in the "highlight" input overlay, representing the match letter or composition.
 * - isComposing:     Whether the user is currently composing text (IME/composition input, e.g. for Hangul typing).
 * - isError:         Indicates whether the current input is considered invalid by validation logic.
 * - lastKey:         The last character/key input detected (used for display or logic feedback).
 * - setInputValue:       Setter to update inputValue.
 * - setHighlightValue:   Setter to update highlightValue.
 * - setIsComposing:      Setter to update isComposing.
 * - setIsError:          Setter to update isError.
 * - setLastKey:          Setter to update lastKey.
 * - reset:               Resets all input-related state.
 * 
 * Props on InputBox:
 * - matchLetter:         The current letter to match (with decomposed steps) for input guidance.
 * - disabled:            Whether the input is disabled (prevents editing, changes visual feedback).
 * - onSubmit:            Optional. Called with completed input when "Enter" is pressed and input is non-empty.
 * - onKeyDisplayChange:  Optional. Called with every key typed or erased; used to update key overlay display.
 * 
 * InputBox uses a dual layer input:
 * - The highlight layer shows the expected match letter(s) and composition progress.
 * - The real input layer is where users type. Handlers (change, composition, keydown) keep all state and visual feedback in-sync with the store and parent callbacks.
 */

interface InputBoxProps {
    matchLetter: MatchLetter;
    disabled: boolean;
    onSubmit: (...args: any[]) => void;
}

function InputBox({
    matchLetter,
    disabled,
    onSubmit,
}: InputBoxProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const prevInputRef = useRef<string>("");

    // Zustand selectors - only re-render when specific values change
    const inputValue = useInputStore((state) => state.inputValue);
    const highlightValue = useInputStore((state) => state.highlightValue);
    const isError = useInputStore((state) => state.isError);
    const isComposing = useInputStore((state) => state.isComposing);
    const lastKey = useInputStore((state) => state.lastKey);

    // Initialize highlight value when matchLetter changes
    useEffect(() => {
        if (matchLetter.steps[0]) {
            useInputStore.getState().setHighlightValue(matchLetter.steps[0]);
        }
    }, [matchLetter]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

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

    // Event handlers
    const handleCompositionStart = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
        console.log("IME composition started");
        useInputStore.getState().setIsComposing(true);
    }, []);

    const handleCompositionUpdate = useCallback((e: React.CompositionEvent) => {
        // still composing — ignore
    }, []);

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
        console.log("IME composition ended");
        useInputStore.getState().setIsComposing(false);

        const input = e.currentTarget.value;
        const prev = prevInputRef.current;
        const letter = ""; // No letter detail from IME composition end

        console.clear();
        console.log("--------------");
        console.log("(onCompositionEnd) input:", input);
        console.log("prev input:", prev);
        console.log("composition state:", false);
        console.log("--------------");

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
        }

        console.clear();
        console.log("--------------");
        console.log("input:", input, "letter:", letter);
        console.log("prev input:", prevInputRef.current);
        console.log("composition state:", isComposing);
        console.log("--------------");

        store.setLastKey(letter.slice(-1));

        validateInput(input, prev, letter, isComposing);
    }, [isComposing, isError, validateInput]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
                onSubmit();
                clearInput();
            }
            return;
        }
        if (e.key === "Backspace" && inputValue === "") {
            useInputStore.getState().setLastKey("");
        }
    }, [inputValue, onSubmit, clearInput]);

    const handleBeforeInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
        // console.log("before input: ", e.data);
    }, []);

    // Shared base classes for both input elements
    const sharedInputClasses = "col-start-1 row-start-1 w-full h-20 text-5xl rounded-[0.55rem] font-mono outline-none transition-all duration-200 ease-in-out py-[0.7rem] px-[0.75rem]";

    return (
        <div className="flex flex-row items-center justify-center gap-2">
            {/* {Last Key Display} */}
            <div
                contentEditable={false}
                onChange={() => {}}
                className="flex justify-center items-center w-16 h-16 rounded-lg border text-4xl font-bold"
                style={{
                    borderColor: 'var(--border-default)',
                    background: 'var(--gradient-input)',
                    color: 'var(--text-primary)',
                }}
            >
                <p>{lastKey}</p>
            </div>
            <div className="form-control w-full">
                <div className="grid grid-cols-1 grid-rows-1 relative w-full">
                    {/* Highlight layer - shows the match letter */}
                    <input
                        type="text"
                        disabled={true}
                        readOnly
                        value={highlightValue}
                        className={`${sharedInputClasses} inset-0 pointer-events-none select-none border-transparent border`}
                        style={{
                            background: 'var(--gradient-input)',
                            color: disabled ? 'var(--input-text-disabled)' : 'var(--color-primary)',
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
                        maxLength={7}
                        minLength={2}
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
                            caretColor: disabled ? 'transparent' : 'var(--interactive-focus)',
                            boxShadow: 'inset 0 0 0 1px var(--input-box-shadow)',
                        }}
                        onFocus={(e) => {
                            if (disabled) return;
                            if (!isError) {
                                e.currentTarget.style.borderColor = 'var(--border-focus)';
                                e.currentTarget.style.boxShadow = '0 0 0 1px var(--input-focus-border), 0 0 18px var(--interactive-focus-light)';
                            } else {
                                e.currentTarget.style.boxShadow = '0 0 0 1px var(--input-error-focus-border), 0 0 18px var(--input-error-focus-glow)';
                            }
                        }}
                        onBlur={(e) => {
                            if (disabled) return;
                            e.currentTarget.style.borderColor = isError
                                ? 'var(--input-border-error)'
                                : 'var(--input-border-default)';
                            e.currentTarget.style.boxShadow = 'inset 0 0 0 1px var(--input-box-shadow)';
                        }}
                    />
                    {/* Disabled overlay with lock icon */}
                    {disabled && (
                        <div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                            style={{
                                background: 'var(--input-overlay-disabled)',
                                borderRadius: '0.55rem',
                            }}
                        >
                            <div className="flex flex-col items-center gap-1">
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    style={{ color: 'var(--input-text-disabled)' }}
                                >
                                    <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <span
                                    className="text-xs font-medium"
                                    style={{ color: 'var(--input-text-disabled)' }}
                                >
                                    {gameStrings.inputDisabledText}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                {isError && !disabled && (
                    <label className="label py-1">
                        <span className="label-text-alt" style={{ color: 'var(--text-error)', fontSize: '0.7rem' }}>
                            {gameStrings.inputInvalidText}
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
export const setInputError = (error: boolean) => useInputStore.getState().setIsError(error);

// Export a function to reset the input
export const resetInput = () => useInputStore.getState().reset();

export default memo(InputBox);

