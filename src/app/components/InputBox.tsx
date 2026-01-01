"use client";

import React, { FormEvent, memo, RefObject, useEffect } from "react";

interface props {
    inputDomHighlight: RefObject<HTMLInputElement | null>;
    inputDom: RefObject<HTMLInputElement | null>;
    onChange?: (e: React.ChangeEvent) => void;
    onBeforeInput?: (e: FormEvent<HTMLInputElement>) => void;
    onCompositionStart?: (e: React.CompositionEvent<HTMLInputElement>) => void;
    onCompositionUpdate?: (e: React.CompositionEvent<HTMLInputElement>) => void;
    onCompositionEnd?: (e: React.CompositionEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    disabled: boolean;
};

function InputBox({
    inputDomHighlight,
    inputDom,
    onChange,
    onCompositionStart,
    onCompositionUpdate,
    onCompositionEnd,
    onBeforeInput,
    onKeyDown,
    disabled,
}: props) {
    const [isError, setIsError] = React.useState(false);

    // Shared base classes for both input elements
    const sharedInputClasses = "col-start-1 row-start-1 w-full h-20 text-5xl rounded-[0.55rem] font-mono outline-none transition-all duration-200 ease-in-out py-[0.7rem] px-[0.75rem]";

    useEffect(() => {
        inputDom.current?.focus();
    }, []);

    // Watch for invalid class changes on the input element
    useEffect(() => {
        if (!inputDom.current) return;

        // TODO: Replace this with a react hook.
        const observer = new MutationObserver(() => {
            const hasInvalidClass = inputDom.current?.classList.contains('invalid') ?? false;
            setIsError(hasInvalidClass);
        });

        observer.observe(inputDom.current, {
            attributes: true,
            attributeFilter: ['class'],
        });

        // Initial check
        setIsError(inputDom.current.classList.contains('invalid'));

        return () => observer.disconnect();
    }, [inputDom]);

    return (
        <div className="form-control w-full">
            <div className=" grid grid-cols-1 grid-rows-1 relative w-full">
                {/* Highlight layer - shows the match letter */}
                <input
                    ref={inputDomHighlight}
                    type="text"
                    disabled={true}
                    readOnly
                    className={`${sharedInputClasses} inset-0 pointer-events-none select-none border-transparent border`}
                    style={{ 
                        background: 'var(--gradient-input)',
                        color: disabled ? 'var(--input-text-disabled)' : 'var(--color-primary)',
                        boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.95)',
                        opacity: disabled ? 0.4 : 1,
                    }}
                    aria-hidden="true"
                />
                {/* Actual input layer */}
                <input
                    ref={inputDom}
                    type="text"
                    disabled={disabled}
                    maxLength={7}
                    minLength={2}
                    onChange={onChange}
                    onCompositionStart={onCompositionStart}
                    onCompositionUpdate={onCompositionUpdate}
                    onCompositionEnd={onCompositionEnd}
                    onBeforeInput={onBeforeInput}
                    onKeyDown={onKeyDown}
                    className={`${sharedInputClasses} background-transparent z-10 border disabled:cursor-not-allowed disabled:opacity-70`}
                    style={{
                        borderColor: disabled 
                            ? 'var(--input-border-disabled)' 
                            : isError 
                                ? 'var(--input-border-error)' 
                                : 'var(--input-border-default)',
                        color: disabled ? 'var(--input-text-disabled)' : 'var(--text-primary)',
                        caretColor: disabled ? 'transparent' : 'var(--interactive-focus)',
                        boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.95)',
                    }}
                    onFocus={(e) => {
                        if (disabled) return;
                        if (!isError) {
                            e.currentTarget.style.borderColor = 'var(--border-focus)';
                            e.currentTarget.style.boxShadow = '0 0 0 1px rgba(8, 47, 73, 0.9), 0 0 18px var(--interactive-focus-light)';
                        } else {
                            e.currentTarget.style.boxShadow = '0 0 0 1px rgba(248, 113, 113, 0.3), 0 0 18px rgba(248, 113, 113, 0.2)';
                        }
                    }}
                    onBlur={(e) => {
                        if (disabled) return;
                        e.currentTarget.style.borderColor = isError 
                            ? 'var(--input-border-error)' 
                            : 'var(--input-border-default)';
                        e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(15, 23, 42, 0.95)';
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
                                <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            <span 
                                className="text-xs font-medium"
                                style={{ color: 'var(--input-text-disabled)' }}
                            >
                                Not your turn
                            </span>
                        </div>
                    </div>
                )}
            </div>
            {isError && !disabled && (
                <label className="label py-1">
                    <span className="label-text-alt" style={{ color: '#fecaca', fontSize: '0.7rem' }}>
                        Invalid word
                    </span>
                </label>
            )}
        </div>
    )
}

// export default memo(InputBox, (prevProps: props, nextProps: props): boolean => {
//     console.log("prev", prevProps.inputDomHighlight.current?.value);
//     console.log("next", nextProps.inputDomHighlight.current?.value);
//     return false;
// });

export default memo(InputBox);