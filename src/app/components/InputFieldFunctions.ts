import { RefObject } from "react";
import { MatchLetter } from "../../shared/types";
import { decomposeSyllable } from "../hangul-decomposer";

export type inputHandlerProps = {
    matchLetter: MatchLetter;

    inputDom: RefObject<HTMLInputElement> | RefObject<null>;
    inputDomHighlight: RefObject<HTMLInputElement> | RefObject<null>;
    inputDomText: RefObject<string>;
    inputKeyDisplay: RefObject<HTMLDivElement | null> | RefObject<null>;
    buttonDom: RefObject<HTMLButtonElement> | RefObject<null>;
}

export function buildInputHandlers({
    matchLetter,
    inputDom,
    inputDomHighlight,
    inputDomText,
    inputKeyDisplay,
    buttonDom
}: inputHandlerProps): {
    onChange: (e: React.ChangeEvent<Element>) => string | void;
    onCompositionStart: (e: React.CompositionEvent<HTMLInputElement>) => void;
    onCompositionUpdate: (e: React.CompositionEvent) => void;
    onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => void;
    onBeforeInput: (e: React.FormEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    isComposing: { current: boolean };
} {
    // Track IME composition state
    const isComposing = { current: false };

    function onCompositionStart(e: React.CompositionEvent<HTMLInputElement>) {
        console.log("IME composition started");
        isComposing.current = true;
    }

    function onCompositionUpdate(e: React.CompositionEvent) {
        // console.log("composition update");
        // e.preventDefault();
        // still composing — ignore
    }

    // Helper functions for input manipulation
    const blockInput = () => {
        if (inputDom.current) {
            inputDom.current.value = inputDomText.current;
        }
    };
    
    const clearInput = () => {
        if (inputDom.current && inputDomHighlight.current) {
            inputDom.current.value = inputDomText.current = "";
            inputDomHighlight.current.value = matchLetter.steps[0];
        }
    };
    
    const continueInput = () => {
        if (!inputDom.current || !inputDomHighlight.current) return;
        const input = inputDom.current.value;
        const letterIndex = matchLetter.steps.indexOf(input[0]);
        var highlight_text = input;

        if (letterIndex < 0) {
            inputDomHighlight.current.value = "";
            return;
        }

        inputDomText.current = input;
        highlight_text += decomposeSyllable(matchLetter.block)[letterIndex + 1] ?? "";
        inputDomHighlight.current.value = highlight_text;
    };

    // ------------------------------------------
    // Input validation logic
    // ------------------------------------------
    function validateInput(
        input: string,
        prev: string,
        letter: string,
        composing: boolean
    ): void {
        const ml = matchLetter;
        const block = ml.block;

        const inputIsEmpty = () => input.length == 0;
        const inputIsValidCharacter = () => ml.steps.includes(prev);
        const inputIsFirstLetter = () => prev == "";
        const inputIsValidWord = () => input.startsWith(block);
        const inputIsLonger = () => decomposeSyllable(input).length == decomposeSyllable(block).length + 1;

        if (inputIsEmpty()) {
            console.log("(State S0) input is empty");
            return clearInput();
        }

        if(!isComposing.current){
            if(!inputIsValidWord()) return clearInput();
            return continueInput();
        }

        if (inputIsValidCharacter() || inputIsFirstLetter()) {
            if (input.startsWith(block)){
                console.log("(State S_ㄱ) input starts with block");
                return continueInput();
            }
            if (ml.steps.includes(input)){
                console.log("(State S_ㄱ, S_ㅏ) input includes match letter");
                return continueInput();
            }
            if (decomposeSyllable(input).length == decomposeSyllable(block).length + 1){
                console.log("(State S_강, S_값) input is longer than block");
                
                return continueInput();
            }
            console.log("inputIsComposing || inputIsFirstLetter > no further action");
            return blockInput(); // FIXME: This will revert something like 값 -> 가 when entered. That shouldn't happen, however I'm not sure how fix it.  
        }

        if (inputIsValidWord()) {
            console.log("(State S_가*) input is valid word");
            return continueInput();
        }
        
        // This is when the user is typing a word where the first letter (may) be valid, but is temporarily invalid while the IME is composing.
        // e.g. ㄱ -> 가 -> [ 갇 ]-> 가다
        if (inputIsLonger() && composing) return continueInput();

        // if(!composing && !inputIsValidCharacter) return clearInput(); // doesnt work because ime composition ends after this event

        // cant remember what this was for.
        if(letter == input[0]){
            return clearInput();
        }

        console.log("no state");
        return clearInput();
    }

    function onCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
        console.log("IME composition ended");
        isComposing.current = false;
        
        // Run validation again after composition ends
        if (!inputDom.current || !inputDomHighlight.current || !inputKeyDisplay.current) return;
        
        const input = e.currentTarget.value;
        const prev = inputDomText.current;
        const letter = ""; // No letter detail from IME composition end
        
        console.clear();
        console.log("--------------");
        console.log("(onCompositionEnd) input:", input);
        console.log("prev input:", prev);
        console.log("composition state:", isComposing.current);
        console.log("--------------");
        
        validateInput(input, prev, letter, isComposing.current);
    }

    // ------------------------------------------
    // onChange
    // ------------------------------------------
    function onChange(e: React.ChangeEvent<Element>) {
        if (!inputDom.current || !inputDomHighlight.current || !inputKeyDisplay.current) return;

        e = e as React.ChangeEvent<HTMLInputElement>;
        const event = e.nativeEvent as any as InputEvent;
        const letter = event.data ?? ""; // can be null for delete
        const input = (e.currentTarget as HTMLInputElement).value;
        const prev = inputDomText.current;

        console.clear();
        console.log("--------------");
        console.log("input:", input, "letter:", letter);
        console.log("prev input:", inputDomText.current);
        console.log("composition state:", isComposing.current);
        // console.log("matchLetter:", JSON.stringify(ml));
        console.log("--------------");
        inputKeyDisplay.current.textContent = letter.slice(-1);

        validateInput(input, prev, letter, isComposing.current);
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.repeat || !buttonDom.current || !inputKeyDisplay.current){
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (e.key == " ") {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (e.key == "Enter") {
            e.preventDefault();
            e.stopPropagation();
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
        isComposing,
    }
}
export function setGhostValue(
    inputDomHighlightRef:inputHandlerProps["inputDomHighlight"],
    matchLetterRef:inputHandlerProps["matchLetter"],
) {
    if (inputDomHighlightRef.current) {
        inputDomHighlightRef.current.value = matchLetterRef.steps[0];
    }
}
