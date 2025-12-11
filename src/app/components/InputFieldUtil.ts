
import { RefObject } from "react";
import { buildSyllableSteps, decomposeWord } from "../hangul-decomposer";

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
        isComposing.current = true;
    }

    function onCompositionUpdate() {
        // still composing — ignore
    }

    function onCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
        isComposing.current = false;

        const text = e.currentTarget.value.trim();
        processText(text, null); // no letter detail from IME
    }

    // ------------------------------------------
    // onChange — called AFTER each non-composition event
    // ------------------------------------------
    function onChange(e: React.ChangeEvent<HTMLInputElement>) {

        if (isComposing.current) {
            // IME in progress → DO NOT process yet
            return;
        }

        const event = e.nativeEvent as any as InputEvent;
        const letter = event.data; // can be null for delete
        const text = e.currentTarget.value.trim();

        processText(text, letter);
    }

    // ------------------------------------------------------------
    // CLEAN MAIN LOGIC (replace everything inside with your logic)
    // ------------------------------------------------------------
    function processText(text: string, letter: string | null) {

        const ml = matchLetter.current; // shorthand
        const steps = ml.steps;
        const nextIndex = ml.next;
        const nextLetter = steps[nextIndex];

        const isDelete = (letter == null);

        console.clear();
        console.log("--------------");
        console.log("text:", text, "letter:", letter);
        console.log("matchLetter:", ml);
        console.log("--------------");

        if (text == "가" || isDelete){
            // debugger;
        }

        inputKeyDisplay.current.innerText = letter ?? "";
        if (stopTrackingInput.current && !isDelete){
            console.log("stop");
            return;
        }

        // --------------------------------------------------------
        // 1. First-block correctly typed → reset highlight
        // --------------------------------------------------------
        if (text[0] === ml.block) {
            inputDomHighlight.current.value = "";
            stopTrackingInput.current = true;
            return;
        }

        // --------------------------------------------------------
        // 2. INSERTION LOGIC
        // --------------------------------------------------------
        if (!isDelete && letter) {

            // Case A — user typed the completed block directly
            if (letter === ml.block) {
                console.log("Case A — user typed the completed block directly");
                setCurrentInput(letter);
                inputDomHighlight.current.value = "";
                return;
            }

            // Case B — user typed the next Hangul step correctly
            if (letter === nextLetter) {
                ml.next++; // advance step
                setCurrentInput(letter);
                updateHighlight(ml.block, ml.next);
                return;
            }

            // FIXME
            // Case C — user typed previous step (ㄱ → 가 → backspace → type ㄱ)
            if (text === steps[nextIndex - 1]) {
                updateHighlight(ml.block, nextIndex);
                return;
            }

            // Fallback — block incorrect input
            restorePreviousInput();
            return;
        }

        // --------------------------------------------------------
        // 3. DELETION LOGIC (backspace)
        // --------------------------------------------------------
        if (isDelete) {

            if (text.length === 0) {
                ml.next = 0;
                inputDomHighlight.current.value = steps[0];
                stopTrackingInput.current = false;
            }
            else if (text === steps[nextIndex - 1]) {
                // valid step regression
                // (can add logic if needed)
            }

            inputDomText.current = text;
        }
    }

    // ------------------------------------------------------------
    // HELPERS — abstracts repetitive DOM behavior
    // ------------------------------------------------------------
    function setCurrentInput(letter: string) {
        inputDomText.current = letter;
        inputDom.current.value = letter;
    }

    function restorePreviousInput() {
        inputDom.current.value = inputDomText.current;
    }

    function updateHighlight(block: string, stepIndex: number) {
        const decomposed = decomposeWord(block);
        inputDomHighlight.current.value = decomposed[stepIndex - 1] + decomposed[stepIndex];
    }

    return {
        onChange,
        onCompositionStart,
        onCompositionUpdate,
        onCompositionEnd
    }


}