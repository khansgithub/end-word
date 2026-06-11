import { appendDefinitionToHistory } from "@/shared/wordDefinition";
import { describe, expect, it } from "vitest";

describe("appendDefinitionToHistory", () => {
  const entry = (key: string) => ({
    key,
    data: [{ word: key, definition: `def-${key}` }],
  });

  it("appends a new definition", () => {
    expect(appendDefinitionToHistory([], entry("apple"))).toEqual([entry("apple")]);
  });

  it("replaces an existing definition with the same key", () => {
    const updated = entry("apple");
    updated.data[0].definition = "updated";
    expect(appendDefinitionToHistory([entry("apple")], updated)).toEqual([updated]);
  });

  it("preserves other entries", () => {
    const result = appendDefinitionToHistory([entry("apple")], entry("banana"));
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.key).sort()).toEqual(["apple", "banana"]);
  });
});
