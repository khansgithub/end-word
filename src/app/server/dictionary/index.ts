import { dictionary } from "@/app/server/dictionary/english";
import { randomKoreanWord, validateKoreanWord } from "@/app/server/dictionary/korean";
import { ENGLISH_MIN_WORD_LENGTH } from "@/shared/consts";
import type { DictionaryEntry, GameLanguage } from "@/shared/types";
import { normalizeEnglishWord } from "@/shared/utils";

export async function validateWord(
	word: string,
	language: GameLanguage
): Promise<[true, DictionaryEntry] | false> {
	if (language === "en") {
		const normalized = normalizeEnglishWord(word);
		if (normalized.length < ENGLISH_MIN_WORD_LENGTH) {
			return false;
		}
		const entry = await dictionary.lookup(normalized);
		entry?.data.reverse();
		console.log("validateWord", word, language, entry);
		return entry ? [true, entry] : false;
	}
	return validateKoreanWord(word);
}

export async function randomWord(language: GameLanguage): Promise<string> {
	if (language === "en") return await dictionary.randomWord();
	return randomKoreanWord();
}

export async function matchLetterFromWord(word: string, language: GameLanguage): Promise<string> {
	if (language === "en") return await dictionary.lastMatchLetter(word);
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