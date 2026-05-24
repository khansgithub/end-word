import type { DictionaryEntry } from "@/shared/types";
import {
  isValidEnglishWord,
  lastEnglishMatchLetter,
  lookupEnglishWord,
  normalizeEnglishWord,
  randomEnglishWord,
} from "@/lib/dictionary/english";
import { randomKoreanWord, validateKoreanWord } from "@/lib/dictionary/korean";

export type GameLanguage = "en" | "ko";

export async function validateWord(
  word: string,
  language: GameLanguage
): Promise<[true, DictionaryEntry] | false> {
  if (language === "en") {
    const normalized = normalizeEnglishWord(word);
    const entry = lookupEnglishWord(normalized);
    return entry ? [true, entry] : false;
  }
  return validateKoreanWord(word);
}

export async function randomWord(language: GameLanguage): Promise<string> {
  if (language === "en") return randomEnglishWord();
  return randomKoreanWord();
}

export function matchLetterFromWord(word: string, language: GameLanguage): string {
  if (language === "en") return lastEnglishMatchLetter(word);
  return word.slice(-1);
}

export function wordStartsWithMatchLetter(
  word: string,
  matchLetter: string,
  language: GameLanguage
): boolean {
  if (word.length === 0) return false;
  if (language === "en") {
    return normalizeEnglishWord(word).startsWith(matchLetter.toLowerCase());
  }
  return word[0] === matchLetter;
}

export { isValidEnglishWord, lookupEnglishWord, normalizeEnglishWord };
