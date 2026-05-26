declare module "node-wordnet" {
	export interface WordNetResult {
		synsetOffset: number;
		lexFilenum: number;
		pos: string;
		wCnt: number;
		lemma: string;
		synonyms: string[];
		lexId: string;
		ptrs: Array<unknown>;
		gloss: string;
		def: string;
		exp: string[];
	}

	export default class WordNet {
		constructor(options?: string | { dataDir?: string });

		lookup(
			word: string,
			callback: (
				err: Error | null,
				results: WordNetResult[]
			) => void
		): void;

		get(
			synsetOffset: number,
			pos: string,
			callback: (
				err: Error | null,
				result: WordNetResult
			) => void
		): void;
	}
}
