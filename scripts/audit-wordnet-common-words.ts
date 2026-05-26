/**
 * Audit common English words vs node-wordnet coverage (local lookups only).
 * Word list: set WORD_LIST_PATH to a local .txt file (one word per line), or a single
 * fetch of the Google 10k list is used when no file is provided.
 * Run: npx tsx scripts/audit-wordnet-common-words.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WordNetDictionary } from "../src/app/server/dictionary/wordnet";
import { normalizeEnglishWord } from "../src/shared/utils";

const DEFAULT_WORD_LIST = join(process.cwd(), "scripts", "data", "google-10000-english.txt");

function loadCommonWords(limit = 3000): string[] {
	const listPath = process.env.WORD_LIST_PATH ?? DEFAULT_WORD_LIST;
	const text = readFileSync(listPath, "utf8");
	return text
		.split(/\r?\n/)
		.map((w) => normalizeEnglishWord(w))
		.filter((w) => /^[a-z]+$/.test(w))
		.slice(0, limit);
}

async function main() {
	const limit = Number(process.env.LIMIT ?? 3000);
	const words = loadCommonWords(limit);
	const dict = new WordNetDictionary();

	const missing: string[] = [];
	const found: string[] = [];

	for (const word of words) {
		const entry = await dict.lookup(word);
		if (entry) found.push(word);
		else missing.push(word);
	}

	const outDir = join(process.cwd(), "scripts", "output");
	const report = {
		checked: words.length,
		found: found.length,
		missing: missing.length,
		missingWords: missing,
	};
	writeFileSync(join(outDir, "wordnet-audit.json"), JSON.stringify(report, null, 2));

	console.log(`Checked ${words.length} common words`);
	console.log(`Found in WordNet: ${found.length}`);
	console.log(`Missing: ${missing.length}`);
	console.log("Sample missing:", missing.slice(0, 40).join(", "));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
