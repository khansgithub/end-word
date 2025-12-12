
import { RefObject } from "react";
import { buildSyllableSteps, decomposeSyllable, decomposeWord } from "../hangul-decomposer";

export type MatchLetter = {
    block: string
    steps: Array<string>
    value: string
    next: number
}


export function initMatchLetter(): MatchLetter {
    const block = "가";
    const arr = buildSyllableSteps(block);
    return {
        block: block,
        steps: [...arr, block],
        value: block,
        next: 0
    };
}

type inputHandlerRefs = {
    matchLetter: RefObject<MatchLetter>;

    inputDom: RefObject<HTMLInputElement>;
    inputDomHighlight: RefObject<HTMLInputElement>;
    inputDomText: RefObject<string>;
    inputKeyDisplay: RefObject<HTMLDivElement>;

    buttonDom: RefObject<HTMLButtonElement>;

    playerLastValue: RefObject<string>;

    isComposing: RefObject<boolean>;

    stopTrackingInput: RefObject<boolean>;
}


export function inputHandlers({
    matchLetter,
    inputDom,
    inputDomHighlight,
    inputDomText,
    inputKeyDisplay,
    isComposing,
    stopTrackingInput,
}: inputHandlerRefs) {

    // ------------------------------------------
    // IME HANDLERS (never touch logic here)
    // ------------------------------------------
    function onCompositionStart() {
        console.log("compositionStart")
        isComposing.current = true;
    }

    function onCompositionUpdate(e: React.CompositionEvent) {
        console.log("composition update");
        e.preventDefault();
        // still composing — ignore
    }

    function onCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
        console.log("composition end");

        isComposing.current = false;

        // const text = e.currentTarget.value.trim();
        // processText(text, null); // no letter detail from IME
    }

    // ------------------------------------------
    // onChange — called AFTER each non-composition event
    // ------------------------------------------
    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
        const event = e.nativeEvent as any as InputEvent;
        const letter = event.data; // can be null for delete
        const input = e.currentTarget.value;
        const prev = inputDomText.current;

        const block = matchLetter.current.block;
        const next_i = matchLetter.current.next;

        const blockInput = () => inputDom.current.value = inputDomText.current;
        const continueInput = () => inputDomText.current = inputDom.current.value;
        const clearInput = () => inputDom.current.value = inputDomText.current = "";

        console.clear();
        console.log("--------------");
        console.log("input:", input, "letter:", letter);
        console.log("prev input:", inputDomText.current);
        console.log("matchLetter:", JSON.stringify(matchLetter));
        console.log("--------------");
        inputKeyDisplay.current.textContent = letter;
        //
        // === State S0 ===
        //
        if (prev === "") {
            console.log("state: empty");
            if (input.length == 0) return clearInput();         // S0:empty → S0
            if (input === "ㄱ") return continueInput();         // S0:ㄱ → S_ㄱ
            if (input === "가") return continueInput();         // S0:가 → S_가
            if (input.startsWith("가")) return continueInput(); // S0:가* → S_가*
            return blockInput();                                // all other → reject
        }

        //
        // === State S_ㄱ ===
        //
        if (prev === "ㄱ") {
            console.log("state: ㄱ");
            if (input.length == 0) return clearInput();      // S_ㄱ:empty → S0
            if (input === "가") return continueInput();         // S_ㄱ:가 → S_가
            return blockInput();                                // S_ㄱ:other → reject
        }

        //
        // === State S_가 ===
        //
        if (prev === "가") {
            // debugger;
            console.log("state: 가");
            if (input.length == 0) return clearInput();      // S_가:empty → S0
            if (input === "ㄱ") return continueInput();         // S_가:ㄱ → S_ㄱ
            if (input.startsWith("가")) return continueInput(); // S_가:가* → S_가*
            if (
                input.length == 1 &&
                decomposeSyllable(input).length == decomposeSyllable(block).length + 1
            ) return continueInput();

            if (
                input.length == 1 &&
                decomposeSyllable(input).length == decomposeSyllable(block).length + 2
            ) return continueInput();
            return continueInput();                             // S_가:* → S_가
        }

        //
        // === State S_가* (anything starting with "가", length ≥ 2) ===
        //
        if (prev.startsWith("가")) {
            console.log("state: S_가");
            if (input.length == 0) return clearInput();           // S_가*:empty → S0
            if (input === "ㄱ") return continueInput();          // S_가*:ㄱ → S_ㄱ
            if (input.startsWith("가")) return continueInput();  // S_가*:가* → S_가*
            if (
                input.length == 1 &&
                decomposeSyllable(input).length == decomposeSyllable(block).length + 2
            ) return continueInput();
            return blockInput();                               // all else → reject
        }

        const blockLetters = decomposeSyllable(prev);
        console.log(blockLetters);

        //
        // === State S_강 (anything with the correct first 2 letters and 1 other letter) ===
        //
        if (blockLetters.slice(0, -1).join("") == decomposeSyllable(block).join("")) {
            console.log("state: S_강");
            if (input.length == 0) return clearInput();           // empty → S0
            if (input.startsWith("가")) return continueInput();  // S_가*:가* → S_가*
            if (decomposeSyllable(input).slice(0, -1).join("") == decomposeSyllable(block).join("")) return continueInput();
        }

        //
        // === State S_값 (anything with the correct first 2 letters and 2 other letters) ===
        //
        if (blockLetters.slice(0, -2).join("") == decomposeSyllable(block).join("")) {
            console.log("state: S_값");
            if (input.length == 0) return clearInput();           // empty → S0
            if (input.startsWith("가")) return continueInput();  // S_가*:가* → S_가*
            if (
                input.length == 1 &&
                decomposeSyllable(input).length == decomposeSyllable(block).length + 1
            ) return continueInput();
        }

        //
        // unreachable fallback
        //
        console.log("no state");
        return clearInput();
        // processText(text, letter);
    }

    function onKeyDown(e: React.KeyboardEvent | React.FormEventHandler<HTMLInputElement>) {
        // console.log("-------------- key down");
        // console.log(e.key, inputKeyDisplay.current, inputKeyDisplay.current.textContent);
        // if(e.key && inputKeyDisplay.current)
        //     if(e.key.match(/^[a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ]$/))
        //         inputKeyDisplay.current.textContent = e.key;
        // else{
        //     inputKeyDisplay.current.textContent = e.data;
        // }
    }

    function onBeforeInput(e: React.FormEvent<HTMLInputElement>) {
        console.log("before input: ", e.data);
    }

    return {
        onChange,
        onCompositionStart,
        onCompositionUpdate,
        onCompositionEnd,
        onBeforeInput,
        onKeyDown,
    }


}