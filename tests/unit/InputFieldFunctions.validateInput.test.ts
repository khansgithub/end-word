import { describe, it, expect } from "vitest";
import { MatchLetter } from "../../src/shared/types";
import { validateInput } from "../../src/app/components/inputValidation";

// TODO: Look over these tests
describe("validateInput", () => {
    // Helper to create a MatchLetter for testing
    const createMatchLetter = (block: string, steps: string[]): MatchLetter => ({
        block,
        steps,
        value: block,
        next: 0,
    });

    describe("empty input", () => {
        it("should return CLEAR when input is empty", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("", "가", "a", false, matchLetter);
            expect(result).toEqual({ type: "CLEAR" });
        });

        it("should return CLEAR when input is empty even with composing", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("", "가", "a", true, matchLetter);
            expect(result).toEqual({ type: "CLEAR" });
        });
    });

    describe("non-composing mode", () => {
        it("should return CLEAR when input does not start with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("나", "가", "나", false, matchLetter);
            expect(result).toEqual({ type: "CLEAR" });
        });

        it("should return CONTINUE when input starts with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("가다", "가", "다", false, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "가다" });
        });

        it("should return CONTINUE when input equals block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("가", "ㄱ", "ㅏ", false, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "가" });
        });
    });

    describe("composing mode - valid character or first letter", () => {
        it("should return CONTINUE when input starts with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("가", "ㄱ", "ㅏ", true, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "가" });
        });

        it("should return CONTINUE when input is in matchLetter.steps", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("ㄱ", "", "ㄱ", true, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "ㄱ" });
        });

        it("should return CONTINUE when input is longer than block by one syllable", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            // "강" is longer than "가" (has a final consonant)
            const result = validateInput("강", "가", "ㅇ", true, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "강" });
        });

        it("should return BLOCK when input is valid character but doesn't match any condition", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            // When prev is in steps but input doesn't match any CONTINUE condition
            // Using a case where prev is valid but input doesn't match
            const result = validateInput("나", "가", "나", true, matchLetter);
            expect(result).toEqual({ type: "BLOCK" });
        });

        it("should return CONTINUE when prev is empty (first letter)", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("ㄱ", "", "ㄱ", true, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "ㄱ" });
        });
    });

    describe("composing mode - valid word", () => {
        it("should return CONTINUE when input starts with block", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("가다", "가", "다", true, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "가다" });
        });

        it("should return CONTINUE when input is longer than block by one syllable", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("강", "가", "ㅇ", true, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "강" });
        });
    });

    describe("composing mode - edge cases", () => {
        it("should return BLOCK when prev is valid character but input doesn't match", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            // When prev is in steps, it goes into the validCharacter block
            // Since input doesn't match any CONTINUE condition, it returns BLOCK
            const result = validateInput("나", "가", "나", true, matchLetter);
            expect(result).toEqual({ type: "BLOCK" });
        });

        it("should return CLEAR when letter equals first character of input and prev is not valid", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            // When prev is not in steps and not first letter, it checks letter === input[0]
            const result = validateInput("나", "나", "나", true, matchLetter);
            expect(result).toEqual({ type: "CLEAR" });
        });

        it("should return CLEAR as fallback when no conditions match and prev is not valid", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            // When prev is not in steps, not first letter, and doesn't match other conditions
            const result = validateInput("바", "다", "바", true, matchLetter);
            expect(result).toEqual({ type: "CLEAR" });
        });
    });

    describe("complex scenarios", () => {
        it("should handle multi-syllable words correctly", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("가나다", "가나", "다", false, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "가나다" });
        });

        it("should handle words with final consonants", () => {
            const matchLetter = createMatchLetter("값", ["ㄱ", "가", "값"]);
            const result = validateInput("값", "가", "ㅂ", true, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "값" });
        });

        it("should handle step-by-step composition", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            
            // Step 1: First letter
            const step1 = validateInput("ㄱ", "", "ㄱ", true, matchLetter);
            expect(step1).toEqual({ type: "CONTINUE", input: "ㄱ" });
            
            // Step 2: Complete syllable
            const step2 = validateInput("가", "ㄱ", "ㅏ", true, matchLetter);
            expect(step2).toEqual({ type: "CONTINUE", input: "가" });
        });

        it("should handle invalid input during composition", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            // When prev is valid (in steps), invalid input returns BLOCK
            const result = validateInput("바", "가", "바", true, matchLetter);
            expect(result).toEqual({ type: "BLOCK" });
        });
    });

    describe("real-world Korean word examples", () => {
        it("should validate '가다' starting with '가'", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("가다", "가", "다", false, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "가다" });
        });

        it("should validate '강' (가 + final consonant) during composition", () => {
            const matchLetter = createMatchLetter("가", ["ㄱ", "가"]);
            const result = validateInput("강", "가", "ㅇ", true, matchLetter);
            expect(result).toEqual({ type: "CONTINUE", input: "강" });
        });

        it("should handle '값' composition", () => {
            const matchLetter = createMatchLetter("값", ["ㄱ", "가", "값"]);
            // During composition of '값'
            const result1 = validateInput("가", "ㄱ", "ㅏ", true, matchLetter);
            expect(result1).toEqual({ type: "CONTINUE", input: "가" });
            
            const result2 = validateInput("값", "가", "ㅂ", true, matchLetter);
            expect(result2).toEqual({ type: "CONTINUE", input: "값" });
        });
    });
});
