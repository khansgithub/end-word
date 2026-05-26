// import { WinkLexiconEnglish } from "@/app/server/dictionary/english-wink-lexicon";
import { WordNetDictionary } from "@/app/server/dictionary/wordnet";

// const winkLexiconEnglish = new WinkLexiconEnglish();
const wordNetEnglish = new WordNetDictionary();
export const dictionary = wordNetEnglish;
// Example test usage (for illustration/demo purposes only — not part of a test suite)
async function testDictionaryLookup() {
	const result = (await dictionary.lookup("cat"))?.data?.at(-1);
	console.log("Lookup result for 'hat':", result);
}
