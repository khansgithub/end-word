/**
 * Spot-check dictionary lookups (local only). Run: npx tsx scripts/verify-english-dictionary.ts
 */
import { WordNetDictionary } from "../src/app/server/dictionary/wordnet";

const SAMPLES = ["when", "the", "products", "cat", "gonna", "is", "xyznotaword"];

async function main() {
	const dict = new WordNetDictionary();
	for (const word of SAMPLES) {
		const entry = await dict.lookup(word);
		const def = entry?.data?.[0]?.definition?.slice(0, 70) ?? "(not found)";
		console.log(`${word}: ${entry ? "OK" : "MISS"} — ${def}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
