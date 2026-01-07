import { describe, it, expect, beforeEach } from "vitest";
import { StoreApi } from "zustand";
import { MatchLetter } from "../shared/types";
import { blockInput as _blockInput, clearInput as _clearInput, continueInput as _continueInput, actionHandlers, ValidationAction } from "../app/components/inputValidation";
import { decomposeSyllable, buildSyllableSteps } from "../app/hangul-decomposer";
import { InputState } from "../app/store/userStore";

describe("actionHandlers", () => {
    const createMatchLetter = (block: string, steps: string[]): MatchLetter => ({
        block,
        steps,
        value: block,
        next: 0,
    });

    let mockStore: {
        value: string;
        highlightValue: string;
        setInputValue: (v: string) => void;
        setHighlightValue: (v: string) => void;
    };
    let mockStoreApi: StoreApi<InputState>;
    let mockPrevInputRef: { current: string };

    beforeEach(() => {
        mockStore = {
            value: "",
            highlightValue: "",
            setInputValue: (v: string) => { mockStore.value = v; },
            setHighlightValue: (v: string) => { mockStore.highlightValue = v; },
        };

        mockStoreApi = {
            getState: () => mockStore,
        } as any as StoreApi<InputState>;

        mockPrevInputRef = { current: "" };
    });

    it("should handle input sequence: ㄱ -> 가 -> 갇 -> 가다", () => {
        const block = "가";
        const steps = decomposeSyllable(block);
        const composing = true;
        const mockMatchLetter = createMatchLetter(block, steps);

        var action: ValidationAction["type"] | null = null;
        
        const clearInput = () => {
            action = "CLEAR";
            _clearInput(mockStoreApi, mockPrevInputRef, mockMatchLetter);
        };
        const blockInput = () => {
            action = "BLOCK";
            _blockInput(mockStoreApi, mockPrevInputRef);
        };
        const continueInput = (input: string) => {
            action = "CONTINUE";
            _continueInput(mockStoreApi, mockPrevInputRef, mockMatchLetter, input);
        };

        const inputValues = ["ㄱ", "가", "갇", "가다"];

        const expected = [
            { value: "ㄱ", highlightValue: "ㄱㅏ", prev: "ㄱ", action: "CONTINUE" },
            { value: "가", highlightValue: "", prev: "가", action: "CONTINUE" },
            { value: "갇", highlightValue: "", prev: "갇", action: "CONTINUE" },
            { value: "가다", highlightValue: "", prev: "가다", action: "CONTINUE" },
        ];

        inputValues.forEach((input, idx) => {
            action = null;
            actionHandlers(
                input,
                "",
                "input",
                composing,
                mockMatchLetter,
                clearInput,
                blockInput,
                continueInput
            );
            expect(action).toBe(expected[idx].action);
            expect(mockStore.value).toBe(expected[idx].value);
            expect(mockStore.highlightValue).toBe(expected[idx].highlightValue);
            expect(mockPrevInputRef.current).toBe(expected[idx].prev);
        });
    });

    it("should handle input sequence for block 값: ㄱ -> 가 -> 값", () => {
        const block = "값";
        const steps = ["ㄱ", "가", "갑", "값"];
        const composing = true;
        const mockMatchLetter = createMatchLetter(block, steps);

        var action: ValidationAction["type"] | null = null;
        
        const clearInput = () => {
            action = "CLEAR";
            _clearInput(mockStoreApi, mockPrevInputRef, mockMatchLetter);
        };
        const blockInput = () => {
            action = "BLOCK";
            _blockInput(mockStoreApi, mockPrevInputRef);
        };
        const continueInput = (input: string) => {
            action = "CONTINUE";
            _continueInput(mockStoreApi, mockPrevInputRef, mockMatchLetter, input);
        };

        const inputValues = ["ㄱ", "가", "갑", "값"];

        const expected = [
            { value: "ㄱ", highlightValue: "ㄱㅏ", prev: "ㄱ", action: "CONTINUE"  },
            { value: "가", highlightValue: "가ㅂ", prev: "가", action: "CONTINUE" },
            { value: "갑", highlightValue: "갑ㅅ", prev: "갑", action: "CONTINUE" },
            { value: "값", highlightValue: "값", prev: "값", action: "CONTINUE" }
        ];

        let prevInput = "";
        inputValues.forEach((input, idx) => {
            action = null;
            actionHandlers(
                input,
                prevInput,
                "input",
                composing,
                mockMatchLetter,
                clearInput,
                blockInput,
                continueInput
            );
            expect(action).toBe(expected[idx].action);
            expect(mockStore.value).toBe(expected[idx].value);
            expect(mockStore.highlightValue).toBe(expected[idx].highlightValue);
            expect(mockPrevInputRef.current).toBe(expected[idx].prev);
            prevInput = mockPrevInputRef.current;
        });
    });
});

describe("buildSyllableSteps", () => {
    it("should build steps for single syllable without final", () => {
        const steps = buildSyllableSteps("가");
        expect(steps).toEqual(["ㄱ", "가"]);
    });

    it("should build steps for syllable with simple final", () => {
        const steps = buildSyllableSteps("갑");
        expect(steps).toEqual(["ㄱ", "가", "갑"]);
    });

    it("should build steps for syllable with double final", () => {
        const steps = buildSyllableSteps("값");
        expect(steps).toEqual(["ㄱ", "가", "갑", "값"]);
    });

    it("should build steps for syllable with double initial and final", () => {
        const steps = buildSyllableSteps("씼");
        expect(steps).toEqual(["ㅅ", "ㅆ", "씨", "씻", "씼"]);
    });
});
