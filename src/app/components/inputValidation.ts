import { StoreApi } from "zustand";
import { MatchLetter } from "../../shared/types";
import { decomposeSyllable } from "../hangul-decomposer";
import { InputState } from "../store/userStore";

/**
 * Validation action types that determine what should happen to the input
 */
export type ValidationAction = 
    | { type: "CLEAR" }
    | { type: "BLOCK" }
    | { type: "CONTINUE"; input: string };

/**
 * Pure validation logic that determines what action should be taken based on input state.
 * This function contains no side effects and only returns a decision.
 * 
 * @param input - Current input value
 * @param prev - Previous input value
 * @param letter - The letter that was just typed (can be empty for deletes)
 * @param composing - Whether IME composition is active
 * @param matchLetter - The match letter configuration
 * @returns ValidationAction indicating what should happen
 */
export function validateInput(
    input: string,
    prev: string,
    letter: string,
    composing: boolean,
    matchLetter: MatchLetter
): ValidationAction {
    const block = matchLetter.block;

    // Helper predicates
    const inputIsEmpty = () => input.length === 0;
    const inputIsValidCharacter = () => matchLetter.steps.includes(prev);
    const inputIsFirstLetter = () => prev === "";
    const inputIsValidWord = () => input.startsWith(block);
    const inputIsLonger = () => decomposeSyllable(input).length === decomposeSyllable(block).length + 1;

    if (inputIsEmpty()) {
        console.log("(State S0) input is empty");
        return { type: "CLEAR" };
    }

    if (!composing) {
        if (!inputIsValidWord()) return { type: "CLEAR" };
        return { type: "CONTINUE", input };
    }

    if (inputIsValidCharacter() || inputIsFirstLetter()) {
        if (input.startsWith(block)) {
            console.log("(State S_ㄱ) input starts with block");
            return { type: "CONTINUE", input };
        }
        if (matchLetter.steps.includes(input)) {
            console.log("(State S_ㄱ, S_ㅏ) input includes match letter");
            return { type: "CONTINUE", input };
        }
        if (decomposeSyllable(input).length === decomposeSyllable(block).length + 1) {
            console.log("(State S_강, S_값) input is longer than block");
            return { type: "CONTINUE", input };
        }
        console.log("inputIsComposing || inputIsFirstLetter > no further action");
        return { type: "BLOCK" }; // FIXME: This will revert something like 값 -> 가 when entered. That shouldn't happen, however I'm not sure how fix it.
    }

    if (inputIsValidWord()) {
        console.log("(State S_가*) input is valid word");
        return { type: "CONTINUE", input };
    }

    // This is when the user is typing a word where the first letter (may) be valid, but is temporarily invalid while the IME is composing.
    // e.g. ㄱ -> 가 -> [ 갇 ]-> 가다
    if (inputIsLonger() && composing) return { type: "CONTINUE", input };

    // cant remember what this was for.
    if (letter === input[0]) {
        return { type: "CLEAR" };
    }

    console.log("no state");
    return { type: "CLEAR" };
}

/**
 * Calculates the highlight text based on the current input and match letter.
 * This is a pure function that determines what should be shown in the highlight overlay.
 * 
 * @param input - Current input value
 * @param matchLetter - The match letter configuration
 * @returns The highlight text to display, or empty string if invalid
 */
export function calculateHighlightText(input: string, matchLetter: MatchLetter): string {
    if (!input) return matchLetter.steps[0] || "";
    
    const letterIndex = matchLetter.steps.indexOf(input[0]);
    if (letterIndex < 0) return "";

    const highlightText = input + (decomposeSyllable(matchLetter.block)[letterIndex + 1] ?? "");
    return highlightText;
}

export function clearInput(
    useInputStore: StoreApi<InputState>,
    prevInputRef: React.RefObject<String>,
    matchLetter: MatchLetter
){
    const store = useInputStore.getState();
    store.setInputValue("");
    store.setHighlightValue(matchLetter.steps[0] || "");
    prevInputRef.current = "";
    store.setIsError(false);
}

// todo: make a function which does validateInput in inputbox
// this is so that in testing you can mock the dependencies, and test the behaviour
// of the inputbox validation logic more accurately.