import words from "an-array-of-english-words";
import type { EntryDataEng, Dictionary, DictionaryEntry } from "@/shared/types";
import { normalizeEnglishWord } from "@/shared/utils";
import type WordNet from "node-wordnet";
import type { WordNetResult } from "node-wordnet";

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

	async lookup(word: string): Promise<DictionaryEntry | null> {
		const normalized = normalizeEnglishWord(word);
		if (!normalized) {
			return null;
		}

		const results = await this.lookupSynsets(normalized);
		if (!results.length) {
			return null;
		}

		return {
			key: normalized,
			data: results.map(mapSynsetToEntryData),
		};
	}

	async isValidWord(word: string): Promise<boolean> {
		const results = await this.lookupSynsets(word);
		return results.length > 0;
	}

	async lastMatchLetter(word: string): Promise<string> {
		const normalized = normalizeEnglishWord(word);
		const match = normalized.match(/[a-z]$/);
		return match ? match[0] : "";
	}

	async randomWord(): Promise<string> {
		const index = Math.floor(Math.random() * words.length);
		return words[index]!.toLowerCase();
	}
}