import { describe, expect, it } from "vitest";
import { addUsedWord, isWordAlreadyUsed, normalizeSubmittedWord } from "@/shared/usedWords";
import { createTestGameState } from "@tests/unit/GameState.test-helpers";

describe("usedWords", () => {
  it("normalizes English words for comparison", () => {
    expect(normalizeSubmittedWord("Apple", "en")).toBe("apple");
  });

  it("detects duplicate words", () => {
    const state = {
      ...createTestGameState({ language: "en", usedWords: ["apple"] }),
    };
    expect(isWordAlreadyUsed(state, "Apple")).toBe(true);
    expect(isWordAlreadyUsed(state, "banana")).toBe(false);
  });

  it("adds a word only once", () => {
    const state = createTestGameState({ usedWords: [] });
    const once = addUsedWord(state, "사과");
    const twice = addUsedWord(once, "사과");
    expect(once.usedWords).toEqual(["사과"]);
    expect(twice.usedWords).toEqual(["사과"]);
  });
});
