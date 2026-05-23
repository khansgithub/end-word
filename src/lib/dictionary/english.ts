import words from "an-array-of-english-words";
import winkLexicon from "wink-lexicon";
import type { DictionaryEntry, EntryDataEng } from "@/shared/types";

const englishWordSet = new Set(words.map((w) => w.toLowerCase()));
const lex = winkLexicon as {
  wnWords: Record<string, number>;
  wnWordSenses: Record<number, number[]>;
  wnSenses: string[];
};

export function normalizeEnglishWord(word: string): string {
  return word.trim().toLowerCase();
}

export function isValidEnglishWord(word: string): boolean {
  const normalized = normalizeEnglishWord(word);
  if (normalized.length === 0) return false;
  return englishWordSet.has(normalized);
}

export function lastEnglishMatchLetter(word: string): string {
  const normalized = normalizeEnglishWord(word);
  const match = normalized.match(/[a-z]$/);
  return match ? match[0] : normalized.slice(-1);
}

export function lookupEnglishWord(word: string): DictionaryEntry | null {
  const normalized = normalizeEnglishWord(word);
  if (!isValidEnglishWord(normalized)) return null;

  const wordId = lex.wnWords[normalized];
  const data: EntryDataEng[] = [];

  if (wordId !== undefined) {
    const senseIds = lex.wnWordSenses[wordId] ?? [];
    for (const senseId of senseIds.slice(0, 5)) {
      const gloss = lex.wnSenses[senseId];
      if (gloss) {
        data.push({
          word: normalized,
          definition: gloss.replace(/\./g, " ").trim(),
        });
      }
    }
  }

  if (data.length === 0) {
    data.push({ word: normalized, definition: "Valid English word" });
  }

  return { key: normalized, data };
}

export function randomEnglishWord(): string {
  const index = Math.floor(Math.random() * words.length);
  return words[index]!.toLowerCase();
}
