import { RefObject } from "react";
import { buildSyllableSteps, decomposeSyllable, decomposeWord } from "../hangul-decomposer";

export type MatchLetter = {
    block: string
    steps: Array<string>
    value: string
    next: number
}

type inputHandlerRefs = {
    matchLetter: MatchLetter;

    inputDom: RefObject<HTMLInputElement> | RefObject<null>;
    inputDomHighlight: RefObject<HTMLInputElement> | RefObject<null>;
    inputDomText: RefObject<string>;
    inputKeyDisplay: RefObject<HTMLDivElement | null> | RefObject<null>;

    buttonDom: RefObject<HTMLButtonElement> | RefObject<null>;

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
    buttonDom
}: inputHandlerRefs) {
    console.count();
    function onCompositionStart() {
        // console.log("compositionStart")
        // isComposing.current = true;
    }

    function onCompositionUpdate(e: React.CompositionEvent) {
        // console.log("composition update");
        // e.preventDefault();
        // still composing — ignore
    }

    function onCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
        // console.log("composition end");
        // isComposing.current = false;
        // const text = e.currentTarget.value.trim();
        // processText(text, null); // no letter detail from IME
    }

    // ------------------------------------------
    // onChange
    // ------------------------------------------
    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
        const event = e.nativeEvent as any as InputEvent;
        const letter = event.data; // can be null for delete
        const input = e.currentTarget.value;
        const prev = inputDomText.current;

        const ml = matchLetter;
        const block = ml.block;

        const blockInput = () => inputDom.current.value = inputDomText.current;
        const clearInput = () => inputDom.current.value = inputDomHighlight.current.value = inputDomText.current = "";
        const continueInput = () => {
            const input = inputDom.current.value;
            const letterIndex = ml.steps.indexOf(input[0]);
            var highlight_text = input;

            if (letterIndex < 0) {
                inputDomHighlight.current.value = "";
                return;
            }

            inputDomText.current = input;
            highlight_text += decomposeSyllable(block)[letterIndex + 1] ?? "";
            inputDomHighlight.current.value = highlight_text;
        }

        console.clear();
        console.log("--------------");
        console.log("input:", input, "letter:", letter);
        console.log("prev input:", inputDomText.current);
        console.log("matchLetter:", JSON.stringify(ml));
        console.log("--------------");
        inputKeyDisplay.current.textContent = letter;

        if (input.length == 0) return clearInput();
        if ([...ml.steps, ""].includes(prev)) {
            console.log("(State S_ㄱ) state: ", prev);
            if (input.startsWith(block)) return continueInput();
            if (ml.steps.includes(input)) return continueInput();
            if (decomposeSyllable(input).length == decomposeSyllable(block).length + 1) return continueInput();
            return blockInput();
        }

        if (input.startsWith(block)) return continueInput();
        if (decomposeSyllable(input).length == decomposeSyllable(block).length + 1) return continueInput();

        console.log("no state");
        return clearInput();
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.repeat) return;
        if (e.key == "Enter") {
            buttonDom.current.click();
            return;
        }
        if (e.key == "Backspace" && inputDom.current && inputDom.current.value == "") {
            inputKeyDisplay.current.textContent = "";
        }
    }

    function onBeforeInput(e: React.FormEvent<HTMLInputElement>) {
        // console.log("before input: ", e.data);
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