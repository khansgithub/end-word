"use client";

import { FormEvent, memo, ReactEventHandler, RefObject, useEffect, useRef } from "react";

interface props {
    inputDomHighlight: RefObject<HTMLInputElement | null>;
    inputDom: RefObject<HTMLInputElement | null>;
    onChange: (e: FormEvent<HTMLInputElement>) => void;
    onBeforeInput: (e: FormEvent<HTMLInputElement>) => void;
    onCompositionStart: (e: React.CompositionEvent<HTMLInputElement>) => void;
    onCompositionUpdate: (e: React.CompositionEvent<HTMLInputElement>) => void;
    onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
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
}: props) {
    const inputFieldClass = "w-full h-full px-3 col-start-1 row-start-1 rounded-md text-5xl no-underline"
    const inputFeildWrapper = useRef<HTMLDivElement>(null); // use ref to avoid rerenders
    const inputFieldErrorTracker = useRef(false);

    function toggleErrorHighlight(isError: boolean) {
        console.log(isError)
        if (isError) {
            inputFeildWrapper.current?.classList.remove("border-b-red-600");
            inputFeildWrapper.current?.classList.add("border-b-amber-100");
        } else {
            inputFeildWrapper.current?.classList.remove("border-b-amber-100");
            inputFeildWrapper.current?.classList.add("border-b-red-600");
        };
    }

    function onClickFoo(e: any) {
        toggleErrorHighlight(inputFieldErrorTracker.current);
        inputFieldErrorTracker.current = !inputFieldErrorTracker.current;
    }
    const count = useRef(0);
    count.current = count.current + 1;

    useEffect(() => {
        inputDom.current.focus();
    }, []);

    // border-amber-100
    return (
        <div ref={inputFeildWrapper} className={`inputFields w-1/4 h-20 grid grid-cols-1 grid-rows-1 rounded-md transition-colors duration-300 ease-out border-2 border-b-amber-100`}>
            {/* <p suppressHydrationWarning={true} className={"border-2 border-white"}>inputbox {count.current}</p> */}
            {/* <button onClick={onClickFoo}> click me </button> */}
            <input
                ref={inputDomHighlight}
                type="text"
                disabled={true}
                // value={matchLetter?.value ?? ""}
                className={`${inputFieldClass} pointer-events-none select-none text-red-500`}
            />
            <input
                ref={inputDom}
                // placeholder={matchLetter.block}
                maxLength={7}
                minLength={2}
                type="text"
                lang="ko"
                onChange={onChange}
                // onCompositionStart={onCompositionStart}
                // onCompositionUpdate={onCompositionUpdate}
                // onCompositionEnd={onCompositionEnd}
                // onBeforeInput={onBeforeInput}
                onKeyDown={onKeyDown}
                // onInput={onKeyDown}
                className={`${inputFieldClass} focus:outline-none focus:ring-2 focus:ring-blue-400`}
            />

        </div>
    )
}

export default memo(InputBox, (prevProps: props, nextProps: props): boolean => {
    console.log("prev", prevProps.inputDomHighlight.current.value);
    console.log("next", nextProps.inputDomHighlight.current.value);
    return false;
});

// export default memo(InputBox);