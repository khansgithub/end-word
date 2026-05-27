/** Simple lemma variants for WordNet fallback lookup. */
export function lemmaVariants(word: string): string[] {
    const variants = new Set<string>([word]);
    if (word.endsWith("ies") && word.length > 4) {
        variants.add(word.slice(0, -3) + "y");
    }
    if (word.endsWith("es") && word.length > 3) {
        variants.add(word.slice(0, -2));
        variants.add(word.slice(0, -1));
    }
    if (word.endsWith("s") && word.length > 2) {
        variants.add(word.slice(0, -1));
    }
    if (word.endsWith("ing") && word.length > 5) {
        variants.add(word.slice(0, -3));
        variants.add(word.slice(0, -3) + "e");
    }
    if (word.endsWith("ed") && word.length > 4) {
        variants.add(word.slice(0, -2));
        variants.add(word.slice(0, -1));
    }
    return [...variants];
}
