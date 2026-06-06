/** Local WordNet lemma variants for inflected forms missing as direct lemmas. */
export const LEMMA_CANDIDATES: Array<(word: string) => string[]> = [
	(w) => [w],
	(w) => (w.endsWith("ies") && w.length > 4 ? [w.slice(0, -3) + "y"] : []),
	(w) => (w.endsWith("ies") && w.length > 4 ? [w.slice(0, -3) + "ie"] : []),
	(w) => (w.endsWith("es") && w.length > 3 ? [w.slice(0, -2), w.slice(0, -1)] : []),
	(w) => (w.endsWith("s") && w.length > 3 ? [w.slice(0, -1)] : []),
	(w) => (w.endsWith("ed") && w.length > 4 ? [w.slice(0, -2), w.slice(0, -1) + "e"] : []),
	(w) => (w.endsWith("ing") && w.length > 5 ? [w.slice(0, -3), w.slice(0, -3) + "e"] : []),
	(w) => (w.endsWith("en") && w.length > 4 ? [w.slice(0, -2)] : []),
];

export function lemmaVariants(word: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const candidates of LEMMA_CANDIDATES) {
		for (const lemma of candidates(word)) {
			if (!lemma || seen.has(lemma)) continue;
			seen.add(lemma);
			out.push(lemma);
		}
	}
	return out;
}

export function glossToDefinition(gloss: string): string {
	return gloss.split(";")[0]?.trim() ?? "";
}
