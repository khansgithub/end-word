import { describe, it, expect } from "vitest";
import { MatchLetter } from "../shared/types";
import { buildInputHandlers } from "../app/components/InputFieldFunctions";

describe("validateInput function", () => {
    // Helper to create a mock MatchLetter
    function createMatchLetter(block: string, steps: string[]): MatchLetter {
        return {
            block,
            steps,
            value: block,
            next: 0,
        };
    }

    // Helper to create input handlers with spies
    function createTestHandlers(matchLetter: MatchLetter) {
        const inputDom = { current: { value: "" } as HTMLInputElement };
        const inputDomHighlight = { current: { value: "" } as HTMLInputElement };
        const inputDomText = { current: "" };
        const inputKeyDisplay = { current: { textContent: "" } as HTMLDivElement };
        const buttonDom = { current: null as HTMLButtonElement | null };

        const handlers = buildInputHandlers({
            matchLetter,
            inputDom: inputDom as any,
            inputDomHighlight: inputDomHighlight as any,
            inputDomText: inputDomText as any,
            inputKeyDisplay: inputKeyDisplay as any,
            buttonDom: buttonDom as any,
        });

        return {
            handlers,
            inputDom,
            inputDomHighlight,
            inputDomText,
            inputKeyDisplay,
            buttonDom,
        };
    }

    // Helper to trigger validateInput indirectly through onChange
    function triggerValidation(
        handlers: ReturnType<typeof createTestHandlers>,
        input: string,
        prev: string,
        letter: string,
        isComposing: boolean
    ) {
        // Set up the state
        handlers.inputDomText.current = prev;
        handlers.inputDom.current.value = input;
        handlers.handlers.isComposing.current = isComposing;

        // Create a mock event
        const mockEvent = {
            currentTarget: handlers.inputDom.current,
            nativeEvent: {
                data: letter,
            },
        } as any;

        handlers.handlers.onChange(mockEvent);
    }

    describe("Empty input handling", () => {
        // User deletes all text (e.g., backspace/delete key). Expected to clear the input field.
        it("should clear input when input is empty string", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "가";
            handlers.inputDom.current.value = "";
            handlers.inputDomHighlight.current.value = "가";

            triggerValidation(handlers, "", "가", "", false);

            expect(handlers.inputDom.current.value).toBe("");
            expect(handlers.inputDomText.current).toBe("");
        });

        // User starts with an empty field and it remains empty. Expected to clear the input field.
        it("should clear input when input is empty and prev is empty", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);

            triggerValidation(handlers, "", "", "", false);

            expect(handlers.inputDom.current.value).toBe("");
            expect(handlers.inputDomText.current).toBe("");
        });
    });

    describe("Non-composing state (normal typing)", () => {
        // User types "나" when the expected block is "가". Expected to clear the input since it doesn't start with the required block.
        it("should clear input when input does not start with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "가";
            handlers.inputDom.current.value = "나";
            handlers.inputDomHighlight.current.value = "가";

            triggerValidation(handlers, "나", "가", "나", false);

            expect(handlers.inputDom.current.value).toBe("");
            expect(handlers.inputDomText.current).toBe("");
        });

        // User types "가" when the block is "가". Expected to allow the input to continue.
        it("should continue input when input starts with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "가";
            handlers.inputDomHighlight.current.value = "ㄱ";

            triggerValidation(handlers, "가", "", "가", false);

            expect(handlers.inputDomText.current).toBe("가");
        });

        // User types "가방" when the block is "가". Expected to allow the input to continue since it starts with the block.
        it("should continue input when input is longer word starting with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "가";
            handlers.inputDom.current.value = "가방";
            handlers.inputDomHighlight.current.value = "가";

            triggerValidation(handlers, "가방", "가", "방", false);

            expect(handlers.inputDomText.current).toBe("가방");
        });
    });

    describe("Composing state (IME input)", () => {
        // User is composing "가" via IME (Input Method Editor). Expected to allow the input to continue.
        it("should continue input when composing and input starts with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "가";
            handlers.inputDomHighlight.current.value = "ㄱ";

            triggerValidation(handlers, "가", "", "가", true);

            expect(handlers.inputDomText.current).toBe("가");
        });

        // User types "ㄱ" (the first step) while composing via IME. Expected to allow the input to continue.
        it("should continue input when composing and input is in steps", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "ㄱ";
            handlers.inputDomHighlight.current.value = "";

            triggerValidation(handlers, "ㄱ", "", "ㄱ", true);

            expect(handlers.inputDomText.current).toBe("ㄱ");
        });

        // User types "강" (which is longer than "가" due to final consonant) while composing via IME. Expected to allow the input to continue.
        it("should continue input when composing and input is longer than block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            // "강" is longer than "가" (has a final consonant)
            handlers.inputDomText.current = "가";
            handlers.inputDom.current.value = "강";
            handlers.inputDomHighlight.current.value = "가";

            triggerValidation(handlers, "강", "가", "강", true);

            expect(handlers.inputDomText.current).toBe("강");
        });

        // User types an invalid intermediate state "갂" while composing (after typing "ㄱ"). Expected to block/revert the input back to "ㄱ".
        it("should block input when composing, valid character, but doesn't match other conditions", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "ㄱ";
            handlers.inputDom.current.value = "갂"; // Invalid intermediate state
            handlers.inputDomHighlight.current.value = "가";

            const originalValue = handlers.inputDom.current.value;
            triggerValidation(handlers, "갂", "ㄱ", "갂", true);

            // blockInput should revert to prev value
            expect(handlers.inputDom.current.value).toBe("ㄱ");
        });

        // User types "가방" while composing via IME (even though previous input was "나"). Expected to allow the input to continue since it's a valid word starting with the block.
        it("should continue input when composing and input is valid word", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "나";
            handlers.inputDom.current.value = "가방";
            handlers.inputDomHighlight.current.value = "";

            triggerValidation(handlers, "가방", "나", "방", true);

            expect(handlers.inputDomText.current).toBe("가방");
        });

        // User types "갑" (an intermediate state) while composing "값" via IME. Expected to allow the input to continue during composition.
        it("should continue input when composing, input is longer, and composing flag is true", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            // "갑" would be an intermediate state while composing "값"
            handlers.inputDomText.current = "바";
            handlers.inputDom.current.value = "갑";
            handlers.inputDomHighlight.current.value = "바";

            triggerValidation(handlers, "갑", "바", "갑", true);

            expect(handlers.inputDomText.current).toBe("갑");
        });

        // User types "가" where the letter parameter equals the first character of input. Expected to clear the input.
        it("should clear input when letter equals first character of input", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "나";
            handlers.inputDom.current.value = "가";
            handlers.inputDomHighlight.current.value = "";

            triggerValidation(handlers, "가", "나", "가", true);

            expect(handlers.inputDom.current.value).toBe("");
            expect(handlers.inputDomText.current).toBe("");
        });
    });

    describe("Edge cases", () => {
        // User types the first character "ㄱ" when the field is empty. Expected to allow the input to continue.
        it("should handle first letter input (prev is empty)", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "ㄱ";
            handlers.inputDomHighlight.current.value = "";

            triggerValidation(handlers, "ㄱ", "", "ㄱ", true);

            expect(handlers.inputDomText.current).toBe("ㄱ");
        });

        // User types "가방" when the block is "가방" (multi-character). Expected to allow the input to continue.
        it("should handle multi-character block", () => {
            const matchLetter = createMatchLetter("가방", ["ㄱ", "가", "가방"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "가방";
            handlers.inputDomHighlight.current.value = "ㄱ";

            triggerValidation(handlers, "가방", "", "방", false);

            expect(handlers.inputDomText.current).toBe("가방");
        });

        // User types "값" (which has a final consonant "ㅄ") when the block is "값". Expected to allow the input to continue.
        it("should handle block with final consonant", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "값";
            handlers.inputDomHighlight.current.value = "ㅂ";

            triggerValidation(handlers, "값", "", "값", false);

            expect(handlers.inputDomText.current).toBe("값");
        });

        // User types "xyz" (non-Hangul characters) when expecting Hangul input. Expected to clear the input.
        it("should clear input when input is completely invalid", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "가";
            handlers.inputDom.current.value = "xyz";
            handlers.inputDomHighlight.current.value = "가";

            triggerValidation(handlers, "xyz", "가", "x", true);

            expect(handlers.inputDom.current.value).toBe("");
            expect(handlers.inputDomText.current).toBe("");
        });

        // User types "가방" after "가" (with empty letter parameter, e.g., from paste or programmatic input). Expected to allow the input to continue.
        it("should handle empty letter parameter", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "가";
            handlers.inputDom.current.value = "가방";
            handlers.inputDomHighlight.current.value = "가";

            triggerValidation(handlers, "가방", "가", "", false);

            expect(handlers.inputDomText.current).toBe("가방");
        });

        // User types a space before "가" (e.g., " 가"). Expected to clear the input since it doesn't start with the block.
        it("should handle whitespace in input", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = " 가";
            handlers.inputDomHighlight.current.value = "";

            triggerValidation(handlers, " 가", "", " ", false);

            expect(handlers.inputDom.current.value).toBe("");
            expect(handlers.inputDomText.current).toBe("");
        });

        // User types special characters after "가" (e.g., "가!@#"). Expected to allow the input to continue since it starts with the block.
        it("should handle special characters", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "가";
            handlers.inputDom.current.value = "가!@#";
            handlers.inputDomHighlight.current.value = "가";

            triggerValidation(handlers, "가!@#", "가", "!", false);

            // Should continue since it starts with block
            expect(handlers.inputDomText.current).toBe("가!@#");
        });

        // User types numbers (e.g., "123") when expecting Hangul input. Expected to clear the input.
        it("should handle numeric input", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "123";
            handlers.inputDomHighlight.current.value = "";

            triggerValidation(handlers, "123", "", "1", false);

            expect(handlers.inputDom.current.value).toBe("");
            expect(handlers.inputDomText.current).toBe("");
        });

        // User types a very long word starting with "가" (e.g., "가방방방..."). Expected to allow the input to continue.
        it("should handle very long input", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            const longInput = "가" + "방".repeat(100);
            handlers.inputDomText.current = "가";
            handlers.inputDom.current.value = longInput;
            handlers.inputDomHighlight.current.value = "가";

            triggerValidation(handlers, longInput, "가", "방", false);

            expect(handlers.inputDomText.current).toBe(longInput);
        });

        // User types "가" when the block is "가방" (input is a substring of the block). Expected to allow the input to continue.
        it("should handle input that is substring of block", () => {
            const matchLetter = createMatchLetter("가방", ["ㄱ", "가", "가방"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "가";
            handlers.inputDomHighlight.current.value = "ㄱ";

            triggerValidation(handlers, "가", "", "가", false);

            expect(handlers.inputDomText.current).toBe("가");
        });

        // User types "나" after typing "ㄱ" (valid previous character but invalid new input). Expected to clear the input.
        it("should handle input where prev is valid character but input doesn't match", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "ㄱ";
            handlers.inputDom.current.value = "나";
            handlers.inputDomHighlight.current.value = "가";

            triggerValidation(handlers, "나", "ㄱ", "나", true);

            expect(handlers.inputDom.current.value).toBe("");
            expect(handlers.inputDomText.current).toBe("");
        });

        // User types "갑" (intermediate state) while composing "값" via IME, where the decomposed length matches block length + 1. Expected to allow the input to continue.
        it("should handle case where input length matches decomposed block length + 1", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            // "값" decomposes to ["ㅂ", "ㅏ", "ㅄ"] (3 chars)
            // "갑" would be an intermediate state
            handlers.inputDomText.current = "바";
            handlers.inputDom.current.value = "갑";
            handlers.inputDomHighlight.current.value = "바";

            triggerValidation(handlers, "갑", "바", "갑", true);

            expect(handlers.inputDomText.current).toBe("갑");
        });
    });

    describe("Complex Hangul scenarios", () => {
        // User types "까" (which uses double consonant "ㄲ") when the block is "까". Expected to allow the input to continue.
        it("should handle double consonants (ㄲ, ㄸ, etc.)", () => {
            const matchLetter = createMatchLetter("까", ["ㄲ", "까"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "까";
            handlers.inputDomHighlight.current.value = "ㄲ";

            triggerValidation(handlers, "까", "", "까", false);

            expect(handlers.inputDomText.current).toBe("까");
        });

        // User types "값" (which has a complex final consonant "ㅄ") when the block is "값". Expected to allow the input to continue.
        it("should handle complex final consonants", () => {
            const matchLetter = createMatchLetter("값", ["ㅂ", "바", "값"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "값";
            handlers.inputDomHighlight.current.value = "ㅂ";

            triggerValidation(handlers, "값", "", "값", false);

            expect(handlers.inputDomText.current).toBe("값");
        });

        // User types "과" (which uses diphthong "ㅘ") when the block is "과". Expected to allow the input to continue.
        it("should handle diphthongs", () => {
            const matchLetter = createMatchLetter("과", ["ㄱ", "고", "과"]);
            const handlers = createTestHandlers(matchLetter);
            
            handlers.inputDomText.current = "";
            handlers.inputDom.current.value = "과";
            handlers.inputDomHighlight.current.value = "ㄱ";

            triggerValidation(handlers, "과", "", "과", false);

            expect(handlers.inputDomText.current).toBe("과");
        });
    });

    describe("State transitions", () => {
        // User starts with empty field, then types "ㄱ", then completes to "가". Expected to allow both transitions.
        it("should handle transition from empty to first character", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            // Start empty
            triggerValidation(handlers, "ㄱ", "", "ㄱ", true);
            expect(handlers.inputDomText.current).toBe("ㄱ");

            // Continue to full syllable
            triggerValidation(handlers, "가", "ㄱ", "가", true);
            expect(handlers.inputDomText.current).toBe("가");
        });

        // User types "가" (valid), then changes to "나" (invalid). Expected to clear the input on the invalid transition.
        it("should handle transition from valid to invalid", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            // Start with valid
            triggerValidation(handlers, "가", "", "가", false);
            expect(handlers.inputDomText.current).toBe("가");

            // Change to invalid
            triggerValidation(handlers, "나", "가", "나", false);
            expect(handlers.inputDom.current.value).toBe("");
            expect(handlers.inputDomText.current).toBe("");
        });

        // User types "ㄱ" while composing via IME, then composition ends and "가" is finalized. Expected to allow both states.
        it("should handle transition from composing to non-composing", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const handlers = createTestHandlers(matchLetter);
            
            // Composing state
            triggerValidation(handlers, "ㄱ", "", "ㄱ", true);
            expect(handlers.inputDomText.current).toBe("ㄱ");

            // Non-composing state (composition ended)
            triggerValidation(handlers, "가", "ㄱ", "가", false);
            expect(handlers.inputDomText.current).toBe("가");
        });
    });
});

