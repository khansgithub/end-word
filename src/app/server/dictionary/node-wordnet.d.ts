declare module "node-wordnet" {
    export type WordNetResult = {
        lemma: string;
        gloss: string;
        synsetOffset: string;
        pos: string;
    };

    export default class WordNet {
        constructor(options?: { dataDir?: string });
        lookup(
            word: string,
            callback: (err: Error | null, results?: WordNetResult[]) => void,
        ): void;
    }
}

declare module "wndb-with-exceptions" {
    const wndb: { path: string };
    export = wndb;
}
