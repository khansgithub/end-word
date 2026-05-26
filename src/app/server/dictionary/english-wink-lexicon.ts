import words from "an-array-of-english-words";
import winkLexicon from "wink-lexicon";
import type { Dictionary as DictionaryType, DictionaryEntry, EntryDataEng } from "@/shared/types";
import { normalizeEnglishWord } from "@/shared/utils";

type WinkLexiconData = {
	wnWords: Record<string, number>;
	wnWordSenses: Record<number, number[]>;
	wnSenses: string[];
};

export class WinkLexiconEnglish implements DictionaryType {
	private static readonly MAX_DEFINITIONS = 5;

	private readonly wordSet = new Set(words.map((w) => w.toLowerCase()));
	private readonly lex = winkLexicon as WinkLexiconData;

	async isValidWord(word: string): Promise<boolean> {
		const normalized = normalizeEnglishWord(word);
		if (normalized.length === 0) return false;
		return this.wordSet.has(normalized);
	}

	async lastMatchLetter(word: string): Promise<string> {
		const normalized = normalizeEnglishWord(word);
		const match = normalized.match(/[a-z]$/);
		return match ? match[0] : normalized.slice(-1);
	}

	async lookup(word: string): Promise<DictionaryEntry | null> {
		const normalized = normalizeEnglishWord(word);
		if (!(await this.isValidWord(normalized))) return null;

		const wordId = this.lex.wnWords[normalized];
		const data: EntryDataEng[] = [];

		if (wordId !== undefined) {
			const senseIds = this.lex.wnWordSenses[wordId] ?? [];
			for (const senseId of senseIds.slice(0, WinkLexiconEnglish.MAX_DEFINITIONS)) {
				const gloss = this.lex.wnSenses[senseId];
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

	async randomWord(): Promise<string> {
		const index = Math.floor(Math.random() * words.length);
		return words[index]!.toLowerCase();
	}
}
