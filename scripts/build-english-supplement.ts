/**
 * Build english-supplement.json from wordnet-audit missing words.
 * Uses only local data: curated manual entries, wink-lexicon, and WordNet lemmas.
 * Skips words already covered by runtime lemma lookup in WordNetDictionary.
 *
 * Prerequisite: npx tsx scripts/audit-wordnet-common-words.ts
 * Run: npx tsx scripts/build-english-supplement.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import winkLexicon from "wink-lexicon";
import { ENGLISH_SUPPLEMENT_PERSON_NAMES } from "../src/app/server/dictionary/english-supplement-excludes";
import { ENGLISH_SUPPLEMENT_MANUAL } from "../src/app/server/dictionary/english-supplement-manual";
import { glossToDefinition, lemmaVariants } from "../src/app/server/dictionary/english-lemma";
import type { EntryDataEng } from "../src/shared/types";
import { normalizeEnglishWord } from "../src/shared/utils";
import type WordNet from "node-wordnet";
import type { WordNetResult } from "node-wordnet";

type Supplement = Record<string, EntryDataEng[]>;

type WinkLexiconData = {
	wnWords: Record<string, number>;
	wnWordSenses: Record<number, number[]>;
	wnSenses: string[];
};

const AUDIT_PATH = join(process.cwd(), "scripts", "output", "wordnet-audit.json");
const OUT_PATH = join(
	process.cwd(),
	"src",
	"app",
	"server",
	"dictionary",
	"english-supplement.json",
);

function getWordNetDataDir(): string {
	const wndb = require("wndb-with-exceptions") as { path: string };
	return wndb.path;
}

function lookupLemma(wn: WordNet, lemma: string): Promise<WordNetResult[]> {
	return new Promise((resolve, reject) => {
		wn.lookup(lemma, (err, results) => {
			if (err) reject(err);
			else resolve(results ?? []);
		});
	});
}

function winkDefinition(word: string, lex: WinkLexiconData): string | null {
	const wordId = lex.wnWords[word];
	if (wordId === undefined) return null;
	const senseIds = lex.wnWordSenses[wordId] ?? [];
	for (const senseId of senseIds.slice(0, 3)) {
		const gloss = lex.wnSenses[senseId];
		if (!gloss || gloss.includes(".")) continue;
		const trimmed = gloss.trim();
		if (trimmed.length > 12) return trimmed;
	}
	return null;
}

async function hasLemmaInWordNet(word: string, wn: WordNet): Promise<boolean> {
	for (const lemma of lemmaVariants(word)) {
		if (lemma === word) continue;
		const results = await lookupLemma(wn, lemma);
		if (results.length) return true;
	}
	return false;
}

async function resolveDefinition(
	word: string,
	wn: WordNet,
	lex: WinkLexiconData,
): Promise<string> {
	if (ENGLISH_SUPPLEMENT_MANUAL[word]) return ENGLISH_SUPPLEMENT_MANUAL[word];

	const wink = winkDefinition(word, lex);
	if (wink) return wink;

	for (const lemma of lemmaVariants(word)) {
		if (lemma === word) continue;
		const results = await lookupLemma(wn, lemma);
		const gloss = results[0]?.gloss;
		if (gloss) return glossToDefinition(gloss);
	}

	return "A common English word.";
}

async function main() {
	const audit = JSON.parse(readFileSync(AUDIT_PATH, "utf8")) as {
		missingWords: string[];
	};
	const WordNetCtor = require("node-wordnet") as typeof WordNet;
	const wn = new WordNetCtor({ dataDir: getWordNetDataDir() });
	const lex = winkLexicon as WinkLexiconData;
	const supplement: Supplement = {};
	const words = audit.missingWords.map(normalizeEnglishWord);

	let skippedLemma = 0;

	for (const word of words) {
		if (word.length < 4) continue;
		if (ENGLISH_SUPPLEMENT_PERSON_NAMES.has(word)) continue;

		if (ENGLISH_SUPPLEMENT_MANUAL[word]) {
			supplement[word] = [{ word, definition: ENGLISH_SUPPLEMENT_MANUAL[word] }];
			continue;
		}

		if (await hasLemmaInWordNet(word, wn)) {
			skippedLemma++;
			continue;
		}

		const definition = await resolveDefinition(word, wn, lex);
		supplement[word] = [{ word, definition }];
	}

	const count = Object.keys(supplement).length;
	writeFileSync(OUT_PATH, JSON.stringify(supplement, null, 2));
	console.log(`Wrote ${count} supplement entries (${skippedLemma} covered by runtime lemma lookup)`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
