import { describe, it, expect, beforeEach } from "vitest";
import { MatchLetter } from "../shared/types";
import { decomposeSyllable } from "../app/hangul-decomposer";
import { useInputBoxStore } from "../app/components/InputBox2";

describe("validateInput function (InputBox2)", () => {
    // Helper to create a mock MatchLetter
    function createMatchLetter(block: string, steps: string[]): MatchLetter {
        return {
            block,
            steps,
            value: block,
            next: 0,
        };
    }

    // Helper to create test setup using InputBox2's store-based approach
    function createTestHandlers(matchLetter: MatchLetter) {
        const storeHook = useInputBoxStore();
        const prevInputRef = { current: "" };

        // Helper functions matching InputBox2's implementation
        const clearInput = () => {
            storeHook.getState().setInputValue("");
            storeHook.getState().setHighlightValue(matchLetter.steps[0] || "");
            prevInputRef.current = "";
            storeHook.getState().setIsError(false);
        };

        const blockInput = () => {
            storeHook.getState().setInputValue(prevInputRef.current);
        };

        const continueInput = (input: string) => {
            storeHook.getState().setInputValue(input);
            prevInputRef.current = input;
            
            const letterIndex = matchLetter.steps.indexOf(input[0]);
            let highlight_text = input;

            if (letterIndex < 0) {
                storeHook.getState().setHighlightValue("");
                return;
            }

            highlight_text += decomposeSyllable(matchLetter.block)[letterIndex + 1] ?? "";
            storeHook.getState().setHighlightValue(highlight_text);
        };

        // Validation logic matching InputBox2's implementation
        const validateInput = (
            input: string,
            prev: string,
            letter: string,
            composing: boolean
        ): void => {
            const ml = matchLetter;
            const block = ml.block;

            const inputIsEmpty = () => input.length === 0;
            const inputIsValidCharacter = () => ml.steps.includes(prev);
            const inputIsFirstLetter = () => prev === "";
            const inputIsValidWord = () => input.startsWith(block);
            const inputIsLonger = () => decomposeSyllable(input).length === decomposeSyllable(block).length + 1;

            if (inputIsEmpty()) {
                console.log("(State S0) input is empty");
                return clearInput();
            }

            if (!composing) {
                if (!inputIsValidWord()) return clearInput();
                return continueInput(input);
            }

            if (inputIsValidCharacter() || inputIsFirstLetter()) {
                if (input.startsWith(block)) {
                    console.log("(State S_ㄱ) input starts with block");
                    return continueInput(input);
                }
                if (ml.steps.includes(input)) {
                    console.log("(State S_ㄱ, S_ㅏ) input includes match letter");
                    return continueInput(input);
                }
                if (decomposeSyllable(input).length === decomposeSyllable(block).length + 1) {
                    console.log("(State S_강, S_값) input is longer than block");
                    return continueInput(input);
                }
                console.log("inputIsComposing || inputIsFirstLetter > no further action");
                return blockInput();
            }

            if (inputIsValidWord()) {
                console.log("(State S_가*) input is valid word");
                return continueInput(input);
            }

            if (inputIsLonger() && composing) return continueInput(input);

            if (letter === input[0]) {
                return clearInput();
            }

            console.log("no state");
            return clearInput();
        };

        return {
            store: storeHook,
            prevInputRef,
            validateInput,
            clearInput,
            blockInput,
            continueInput,
        };
    }

    // Helper to trigger validateInput
    function triggerValidation(
        handlers: ReturnType<typeof createTestHandlers>,
        input: string,
        prev: string,
        letter: string,
        isComposing: boolean
    ) {
        // Set up the state
        handlers.prevInputRef.current = prev;
        handlers.store.getState().setInputValue(input);
        handlers.store.getState().setIsComposing(isComposing);
        handlers.store.getState().setHighlightValue(handlers.store.getState().highlightValue || "");

        // Call validateInput directly
        handlers.validateInput(input, prev, letter, isComposing);
    }

    // Reset store before each test
    beforeEach(() => {
        useInputBoxStore()().reset();
    });

    describe("Empty input handling", () => {
        // User deletes all text (e.g., backspace/delete key). Expected to clear the input field.
        it("should clear input when input is empty string", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "가";
            handlers.store.getState().setInputValue("");
            handlers.store.getState().setHighlightValue("가");

            triggerValidation(handlers, "", "가", "", false);

            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });

        // User starts with an empty field and it remains empty. Expected to clear the input field.
        it("should clear input when input is empty and prev is empty", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);

            triggerValidation(handlers, "", "", "", false);

            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });
    });

    describe("Non-composing state (normal typing)", () => {
        // User types "나" when the expected block is "가". Expected to clear the input since it doesn't start with the required block.
        it("should clear input when input does not start with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "가";
            handlers.store.getState().setInputValue("나");
            handlers.store.getState().setHighlightValue("가");

            triggerValidation(handlers, "나", "가", "나", false);

            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });

        // User types "가" when the block is "가". Expected to allow the input to continue.
        it("should continue input when input starts with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("가");
            handlers.store.getState().setHighlightValue("ㄱ");

            triggerValidation(handlers, "가", "", "가", false);

            expect(handlers.prevInputRef.current).toBe("가");
        });

        // User types "가방" when the block is "가". Expected to allow the input to continue since it starts with the block.
        it("should continue input when input is longer word starting with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "가";
            handlers.store.getState().setInputValue("가방");
            handlers.store.getState().setHighlightValue("가");

            triggerValidation(handlers, "가방", "가", "방", false);

            expect(handlers.prevInputRef.current).toBe("가방");
        });
    });

    describe("Composing state (IME input)", () => {
        // User is composing "가" via IME (Input Method Editor). Expected to allow the input to continue.
        it("should continue input when composing and input starts with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("가");
            handlers.store.getState().setHighlightValue("ㄱ");

            triggerValidation(handlers, "가", "", "가", true);

            expect(handlers.prevInputRef.current).toBe("가");
        });

        // User types "ㄱ" (the first step) while composing via IME. Expected to allow the input to continue.
        it("should continue input when composing and input is in steps", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("ㄱ");
            handlers.store.getState().setHighlightValue("");

            triggerValidation(handlers, "ㄱ", "", "ㄱ", true);

            expect(handlers.prevInputRef.current).toBe("ㄱ");
        });

        // User types "강" (which is longer than "가" due to final consonant) while composing via IME. Expected to allow the input to continue.
        it("should continue input when composing and input is longer than block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            // "강" is longer than "가" (has a final consonant)
            handlers.prevInputRef.current = "가";
            handlers.store.getState().setInputValue("강");
            handlers.store.getState().setHighlightValue("가");

            triggerValidation(handlers, "강", "가", "강", true);

            expect(handlers.prevInputRef.current).toBe("강");
        });

        // User types an invalid intermediate state "갂" while composing (after typing "ㄱ"). Expected to block/revert the input back to "ㄱ".
        it("should block input when composing, valid character, but doesn't match other conditions", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "ㄱ";
            handlers.store.getState().setInputValue("갂"); // Invalid intermediate state
            handlers.store.getState().setHighlightValue("가");

            triggerValidation(handlers, "갂", "ㄱ", "갂", true);

            // blockInput should revert to prev value
            expect(handlers.store.getState().inputValue).toBe("ㄱ");
        });

        // User types "가방" while composing via IME (even though previous input was "나"). Expected to allow the input to continue since it's a valid word starting with the block.
        it("should continue input when composing and input is valid word", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "나";
            handlers.store.getState().setInputValue("가방");
            handlers.store.getState().setHighlightValue("");

            triggerValidation(handlers, "가방", "나", "방", true);

            expect(handlers.prevInputRef.current).toBe("가방");
        });

        // User types "갑" (an intermediate state) while composing "값" via IME. Expected to allow the input to continue during composition.
        it("should continue input when composing, input is longer, and composing flag is true", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            // "갑" would be an intermediate state while composing "값"
            handlers.prevInputRef.current = "바";
            handlers.store.getState().setInputValue("갑");
            handlers.store.getState().setHighlightValue("바");

            triggerValidation(handlers, "갑", "바", "갑", true);

            expect(handlers.prevInputRef.current).toBe("갑");
        });

        // User types "가" where the letter parameter equals the first character of input. Expected to clear the input.
        it("should clear input when letter equals first character of input", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "나";
            handlers.store.getState().setInputValue("가");
            handlers.store.getState().setHighlightValue("");

            triggerValidation(handlers, "가", "나", "가", true);

            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });
    });

    describe("Edge cases", () => {
        // User types the first character "ㄱ" when the field is empty. Expected to allow the input to continue.
        it("should handle first letter input (prev is empty)", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("ㄱ");
            handlers.store.getState().setHighlightValue("");

            triggerValidation(handlers, "ㄱ", "", "ㄱ", true);

            expect(handlers.prevInputRef.current).toBe("ㄱ");
        });

        // User types "가방" when the block is "가방" (multi-character). Expected to allow the input to continue.
        it("should handle multi-character block", () => {
            const matchLetter = createMatchLetter("가방", ["ㄱ", "가", "가방"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("가방");
            handlers.store.getState().highlightValue = "ㄱ";

            triggerValidation(handlers, "가방", "", "방", false);

            expect(handlers.prevInputRef.current).toBe("가방");
        });

        // User types "값" (which has a final consonant "ㅄ") when the block is "값". Expected to allow the input to continue.
        it("should handle block with final consonant", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("값");
            handlers.store.getState().highlightValue = "ㅂ";

            triggerValidation(handlers, "값", "", "값", false);

            expect(handlers.prevInputRef.current).toBe("값");
        });

        // User types "xyz" (non-Hangul characters) when expecting Hangul input. Expected to clear the input.
        it("should clear input when input is completely invalid", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "가";
            handlers.store.getState().setInputValue("xyz");
            handlers.store.getState().highlightValue = "가";

            triggerValidation(handlers, "xyz", "가", "x", true);

            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });

        // User types "가방" after "가" (with empty letter parameter, e.g., from paste or programmatic input). Expected to allow the input to continue.
        it("should handle empty letter parameter", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "가";
            handlers.store.getState().setInputValue("가방");
            handlers.store.getState().highlightValue = "가";

            triggerValidation(handlers, "가방", "가", "", false);

            expect(handlers.prevInputRef.current).toBe("가방");
        });

        // User types a space before "가" (e.g., " 가"). Expected to clear the input since it doesn't start with the block.
        it("should handle whitespace in input", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue(" 가");
            handlers.store.getState().highlightValue = "";

            triggerValidation(handlers, " 가", "", " ", false);

            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });

        // User types special characters after "가" (e.g., "가!@#"). Expected to allow the input to continue since it starts with the block.
        it("should handle special characters", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "가";
            handlers.store.getState().setInputValue("가!@#");
            handlers.store.getState().highlightValue = "가";

            triggerValidation(handlers, "가!@#", "가", "!", false);

            // Should continue since it starts with block
            expect(handlers.prevInputRef.current).toBe("가!@#");
        });

        // User types numbers (e.g., "123") when expecting Hangul input. Expected to clear the input.
        it("should handle numeric input", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("123");
            handlers.store.getState().highlightValue = "";

            triggerValidation(handlers, "123", "", "1", false);

            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });

        // User types a very long word starting with "가" (e.g., "가방방방..."). Expected to allow the input to continue.
        it("should handle very long input", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            const longInput = "가" + "방".repeat(100);
            handlers.prevInputRef.current = "가";
            handlers.store.getState().setInputValue(longInput);
            handlers.store.getState().highlightValue = "가";

            triggerValidation(handlers, longInput, "가", "방", false);

            expect(handlers.prevInputRef.current).toBe(longInput);
        });

        // User types "가" when the block is "가방" (input is a substring of the block). Expected to allow the input to continue.
        it("should handle input that is substring of block", () => {
            const matchLetter = createMatchLetter("가방", ["ㄱ", "가", "가방"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("가");
            handlers.store.getState().highlightValue = "ㄱ";

            triggerValidation(handlers, "가", "", "가", false);

            expect(handlers.prevInputRef.current).toBe("가");
        });

        // User types "나" after typing "ㄱ" (valid previous character but invalid new input). Expected to clear the input.
        it("should handle input where prev is valid character but input doesn't match", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "ㄱ";
            handlers.store.getState().setInputValue("나");
            handlers.store.getState().highlightValue = "가";

            triggerValidation(handlers, "나", "ㄱ", "나", true);

            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });

        // User types "갑" (intermediate state) while composing "값" via IME, where the decomposed length matches block length + 1. Expected to allow the input to continue.
        it("should handle case where input length matches decomposed block length + 1", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            // "값" decomposes to ["ㅂ", "ㅏ", "ㅄ"] (3 chars)
            // "갑" would be an intermediate state
            handlers.prevInputRef.current = "바";
            handlers.store.getState().setInputValue("갑");
            handlers.store.getState().highlightValue = "바";

            triggerValidation(handlers, "갑", "바", "갑", true);

            expect(handlers.prevInputRef.current).toBe("갑");
        });
    });

    describe("Complex Hangul scenarios", () => {
        // User types "까" (which uses double consonant "ㄲ") when the block is "까". Expected to allow the input to continue.
        it("should handle double consonants (ㄲ, ㄸ, etc.)", () => {
            const matchLetter = createMatchLetter("까", ["ㄲ", "까"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("까");
            handlers.store.getState().highlightValue = "ㄲ";

            triggerValidation(handlers, "까", "", "까", false);

            expect(handlers.prevInputRef.current).toBe("까");
        });

        // User types "값" (which has a complex final consonant "ㅄ") when the block is "값". Expected to allow the input to continue.
        it("should handle complex final consonants", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("값");
            handlers.store.getState().highlightValue = "ㅂ";

            triggerValidation(handlers, "값", "", "값", false);

            expect(handlers.prevInputRef.current).toBe("값");
        });

        // User types "과" (which uses diphthong "ㅘ") when the block is "과". Expected to allow the input to continue.
        it("should handle diphthongs", () => {
            const matchLetter = createMatchLetter("과", ["ㄱ", "고", "과"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("과");
            handlers.store.getState().highlightValue = "ㄱ";

            triggerValidation(handlers, "과", "", "과", false);

            expect(handlers.prevInputRef.current).toBe("과");
        });
    });

    describe("State transitions", () => {
        // User starts with empty field, then types "ㄱ", then completes to "가". Expected to allow both transitions.
        it("should handle transition from empty to first character", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            // Start empty
            triggerValidation(handlers, "ㄱ", "", "ㄱ", true);
            expect(handlers.prevInputRef.current).toBe("ㄱ");

            // Continue to full syllable
            triggerValidation(handlers, "가", "ㄱ", "가", true);
            expect(handlers.prevInputRef.current).toBe("가");
        });

        // User types "가" (valid), then changes to "나" (invalid). Expected to clear the input on the invalid transition.
        it("should handle transition from valid to invalid", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            // Start with valid
            triggerValidation(handlers, "가", "", "가", false);
            expect(handlers.prevInputRef.current).toBe("가");

            // Change to invalid
            triggerValidation(handlers, "나", "가", "나", false);
            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });

        // User types "ㄱ" while composing via IME, then composition ends and "가" is finalized. Expected to allow both states.
        it("should handle transition from composing to non-composing", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            // Composing state
            triggerValidation(handlers, "ㄱ", "", "ㄱ", true);
            expect(handlers.prevInputRef.current).toBe("ㄱ");

            // Non-composing state (composition ended)
            triggerValidation(handlers, "가", "ㄱ", "가", false);
            expect(handlers.prevInputRef.current).toBe("가");
        });

    });

    describe("First letter with 3+ syllables (값, 갔, etc.)", () => {
        // User starts from empty and types the first step "ㄱ" when the block is "갔". Expected to allow the input to continue.
        it("should handle first step (initial) when first letter has 3+ syllables", () => {
            const matchLetter = createMatchLetter("갔", ["ㄱ", "가", "갔"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("ㄱ");
            handlers.store.getState().setHighlightValue("");

            triggerValidation(handlers, "ㄱ", "", "ㄱ", true);

            expect(handlers.prevInputRef.current).toBe("ㄱ");
        });

        // User types the second step "가" when the block is "갔" and prev is "ㄱ". Expected to allow the input to continue.
        it("should handle second step (initial+vowel) when first letter has 3+ syllables", () => {
            const matchLetter = createMatchLetter("갔", ["ㄱ", "가", "갔"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "ㄱ";
            handlers.store.getState().setInputValue("가");
            handlers.store.getState().highlightValue = "ㄱ";

            triggerValidation(handlers, "가", "ㄱ", "가", true);

            expect(handlers.prevInputRef.current).toBe("가");
        });

        // User completes to "갔" when the block is "갔" and prev is "가". Expected to allow the input to continue.
        it("should handle completion to full syllable when first letter has 3+ syllables", () => {
            const matchLetter = createMatchLetter("갔", ["ㄱ", "가", "갔"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "가";
            handlers.store.getState().setInputValue("갔");
            handlers.store.getState().highlightValue = "가";

            triggerValidation(handlers, "갔", "가", "갔", true);

            expect(handlers.prevInputRef.current).toBe("갔");
        });

        // User types "값" directly (non-composing) when the block is "값". Expected to allow the input to continue.
        it("should handle direct input of 3+ syllable character in non-composing state", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("값");
            handlers.store.getState().highlightValue = "ㅂ";

            triggerValidation(handlers, "값", "", "값", false);

            expect(handlers.prevInputRef.current).toBe("값");
        });

        // User types "갔" directly (non-composing) when the block is "갔". Expected to allow the input to continue.
        it("should handle direct input of 갔 in non-composing state", () => {
            const matchLetter = createMatchLetter("갔", ["ㄱ", "가", "갔"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("갔");
            handlers.store.getState().highlightValue = "ㄱ";

            triggerValidation(handlers, "갔", "", "갔", false);

            expect(handlers.prevInputRef.current).toBe("갔");
        });

        // User types step-by-step composition for "값": ㅂ -> 바 -> 값. Expected to allow all transitions.
        it("should handle step-by-step composition for 값", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            // Step 1: Initial consonant
            triggerValidation(handlers, "ㅂ", "", "ㅂ", true);
            expect(handlers.prevInputRef.current).toBe("ㅂ");

            // Step 2: Initial + vowel
            triggerValidation(handlers, "바", "ㅂ", "바", true);
            expect(handlers.prevInputRef.current).toBe("바");

            // Step 3: Full syllable with final
            triggerValidation(handlers, "값", "바", "값", true);
            expect(handlers.prevInputRef.current).toBe("값");
        });

        // User types step-by-step composition for "갔": ㄱ -> 가 -> 갔. Expected to allow all transitions.
        it("should handle step-by-step composition for 갔", () => {
            const matchLetter = createMatchLetter("갔", ["ㄱ", "가", "갔"]);
            const handlers = createTestHandlers(matchLetter);
            
            // Step 1: Initial consonant
            triggerValidation(handlers, "ㄱ", "", "ㄱ", true);
            expect(handlers.prevInputRef.current).toBe("ㄱ");

            // Step 2: Initial + vowel
            triggerValidation(handlers, "가", "ㄱ", "가", true);
            expect(handlers.prevInputRef.current).toBe("가");

            // Step 3: Full syllable with final
            triggerValidation(handlers, "갔", "가", "갔", true);
            expect(handlers.prevInputRef.current).toBe("갔");
        });

        // User types invalid intermediate state "갑" while composing "갔" (after typing "가"). Expected to block/revert.
        it("should block invalid intermediate state when composing 3+ syllable character", () => {
            const matchLetter = createMatchLetter("갔", ["ㄱ", "가", "갔"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "가";
            handlers.store.getState().setInputValue("갑"); // Invalid intermediate state for "갔"
            handlers.store.getState().highlightValue = "가";

            triggerValidation(handlers, "갑", "가", "갑", true);

            // blockInput should revert to prev value
            expect(handlers.store.getState().inputValue).toBe("가");
        });

        // User types invalid intermediate state "밥" while composing "값" (after typing "바"). Expected to block/revert.
        it("should block invalid intermediate state when composing 값", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "바";
            handlers.store.getState().setInputValue("밥"); // Invalid intermediate state for "값"
            handlers.store.getState().highlightValue = "바";

            triggerValidation(handlers, "밥", "바", "밥", true);

            // blockInput should revert to prev value
            expect(handlers.store.getState().inputValue).toBe("바");
        });

        // User types "값방" (word starting with "값") when the block is "값". Expected to allow the input to continue.
        it("should handle word starting with 3+ syllable character", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "값";
            handlers.store.getState().setInputValue("값방");
            handlers.store.getState().highlightValue = "값";

            triggerValidation(handlers, "값방", "값", "방", false);

            expect(handlers.prevInputRef.current).toBe("값방");
        });

        // User types "갔다" (word starting with "갔") when the block is "갔". Expected to allow the input to continue.
        it("should handle word starting with 갔", () => {
            const matchLetter = createMatchLetter("갔", ["ㄱ", "가", "갔"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "갔";
            handlers.store.getState().setInputValue("갔다");
            handlers.store.getState().highlightValue = "갔";

            triggerValidation(handlers, "갔다", "갔", "다", false);

            expect(handlers.prevInputRef.current).toBe("갔다");
        });

        // User types invalid input "나" when the block is "값". Expected to clear the input.
        it("should clear input when input doesn't start with 3+ syllable block", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "값";
            handlers.store.getState().setInputValue("나");
            handlers.store.getState().highlightValue = "값";

            triggerValidation(handlers, "나", "값", "나", false);

            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });

        // User types invalid input "나" when the block is "갔". Expected to clear the input.
        it("should clear input when input doesn't start with 갔 block", () => {
            const matchLetter = createMatchLetter("갔", ["ㄱ", "가", "갔"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "갔";
            handlers.store.getState().setInputValue("나");
            handlers.store.getState().highlightValue = "갔";

            triggerValidation(handlers, "나", "갔", "나", false);

            expect(handlers.store.getState().inputValue).toBe("");
            expect(handlers.prevInputRef.current).toBe("");
        });

        // User types "가" (second step) when the block is "갔" but prev is empty. Expected to allow the input to continue.
        it("should handle jumping to second step when first letter has 3+ syllables", () => {
            const matchLetter = createMatchLetter("갔", ["ㄱ", "가", "갔"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("가");
            handlers.store.getState().setHighlightValue("ㄱ");

            triggerValidation(handlers, "가", "", "가", true);

            expect(handlers.prevInputRef.current).toBe("가");
        });

        // User types "바" (second step) when the block is "값" but prev is empty. Expected to allow the input to continue.
        it("should handle jumping to second step when first letter is 값", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.prevInputRef.current = "";
            handlers.store.getState().setInputValue("바");
            handlers.store.getState().highlightValue = "ㅂ";

            triggerValidation(handlers, "바", "", "바", true);

            expect(handlers.prevInputRef.current).toBe("바");
        });
    });
});

