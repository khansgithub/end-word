import { FormEvent, RefObject, useState } from "react";
import { matchLetterType } from "../types";

interface props {
    inputDomHighlight: RefObject<HTMLInputElement | null>;
    inputDom: RefObject<HTMLInputElement| null>;
    matchLetter: matchLetterType;
    inputOnChange: (e: FormEvent<HTMLInputElement>) => void
    triggerButton: (e: React.KeyboardEvent) => void;
};

export default function InputBox({
    inputDomHighlight,
    inputDom,
    matchLetter,
    inputOnChange,
    triggerButton,
}: props) {
    const inputFieldClass = "w-full h-full px-3 col-start-1 row-start-1 rounded-md text-5xl no-underline"
    const [foo, setFoo] = useState(false);
    // border-amber-100
    return (
        <div className={`inputFields w-1/4 h-20 grid grid-cols-1 grid-rows-1 rounded-md border-2  transition-colors ${foo ? 'border-b-red-600' : 'border-amber-100'}`}>
            <button onClick={e => {setFoo((f) => !f)}}> click me </button>
            <input
                ref={inputDomHighlight}
                type="text"
                disabled={true}
                value={matchLetter?.value ?? ""}
                className={`${inputFieldClass} pointer-events-none select-none text-red-500`}
            />
            <input
                ref={inputDom}
                // placeholder={matchLetter.block}
                type="text"
                lang="ko"
                onChange={inputOnChange}
                onKeyDown={triggerButton}
                className={`${inputFieldClass} focus:outline-none focus:ring-2 focus:ring-blue-400`}
            />

        </div>
    )
}