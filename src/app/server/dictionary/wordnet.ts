import { lemmaVariants } from "@/app/server/dictionary/english-lemma";
import supplementData from "@/app/server/dictionary/english-supplement.json";
import { envGet } from "@/app/server/env";
import { ENGLISH_MIN_WORD_LENGTH } from "@/shared/consts";
import type { Dictionary, DictionaryEntry, EntryDataEng } from "@/shared/types";
import { normalizeEnglishWord } from "@/shared/utils";
import words from "an-array-of-english-words";
import type WordNet from "node-wordnet";
import type { WordNetResult } from "node-wordnet";

const supplement = supplementData as Record<string, EntryDataEng[]>;

function getWordNetDataDir(): string {
	// Turbopack turns require.resolve("…/package.json") into a virtual path; use the
	// package's own path export so node-wordnet reads real dict files on disk.
	const wndb = require("wndb-with-exceptions") as { path: string };
	return wndb.path;
}

function extractDefinition(gloss: string): {
	definition: string;
	examples: string[];
} {
	const parts = gloss.split(";");
	const definition = parts[0]?.trim() ?? "";
	const examples = parts
		.slice(1)
		.map((x) => x.trim())
		.map((x) => x.replace(/^"|"$/g, ""))
		.filter(Boolean);

	return { definition, examples };
}

function mapSynsetToEntryData(synset: WordNetResult): EntryDataEng {
	const { definition } = extractDefinition(synset.gloss);
	return {
		word: synset.lemma,
		definition,
	};
}

export class WordNetDictionary implements Dictionary {
	private wordnet: WordNet | null = null;

	private getWordNet(): WordNet {
		if (!this.wordnet) {
			const WordNetCtor = require("node-wordnet") as typeof WordNet;
			this.wordnet = new WordNetCtor({ dataDir: getWordNetDataDir() });
		}
		return this.wordnet;
	}

	private lookupSynsets(word: string): Promise<WordNetResult[]> {
		const normalized = normalizeEnglishWord(word);
		if (!normalized) {
			return Promise.resolve([]);
		}

		return new Promise((resolve, reject) => {
			this.getWordNet().lookup(normalized, (err, results) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(results ?? []);
			});
		});
	}

	private lookupSupplement(word: string): DictionaryEntry | null {
		const data = supplement[word];
		if (!data?.length) return null;
		return { key: word, data };
	}

	private async lookupLemmaSynsets(word: string): Promise<WordNetResult[]> {
		for (const lemma of lemmaVariants(word)) {
			if (lemma === word) continue;
			const results = await this.lookupSynsets(lemma);
			if (results.length) return results;
		}
		return [];
	}

	async lookup(word: string): Promise<DictionaryEntry | null> {
		const normalized = normalizeEnglishWord(word);
		if (!normalized) {
			return null;
		}

		let results = await this.lookupSynsets(normalized);
		if (!results.length) {
			results = await this.lookupLemmaSynsets(normalized);
		}

		if (results.length) {
			return {
				key: normalized,
				data: results.map(mapSynsetToEntryData),
			};
		}

		return this.lookupSupplement(normalized);
	}

	async isValidWord(word: string): Promise<boolean> {
		const normalized = normalizeEnglishWord(word);
		if (supplement[normalized]) return true;
		if ((await this.lookupSynsets(normalized)).length) return true;
		if ((await this.lookupLemmaSynsets(normalized)).length) return true;
		return false;
	}

	async lastMatchLetter(word: string): Promise<string> {
		const normalized = normalizeEnglishWord(word);
		const match = normalized.match(/[a-z]$/);
		return match ? match[0] : "";
	}

	async randomWord(): Promise<string> {
		if (envGet("MOCK_GET_RANDOM_WORD") === "true") {
			console.log(`[WordNetDictionary] Using mocked random word: ${envGet("MOCK_RANDOM_WORD")}`);
			return (envGet("MOCK_RANDOM_WORD") || "foo").toLowerCase();
		}
		const eligible = words.filter((w) => w.length >= ENGLISH_MIN_WORD_LENGTH);
		const index = Math.floor(Math.random() * eligible.length);
		return eligible[index]!.toLowerCase();
	}
}
async function test(word: string) {
	const dictionary = new WordNetDictionary();
	const entry = await dictionary.lookup(word);
	console.log(JSON.stringify(entry, null, 2));
}

// test("nimble");
