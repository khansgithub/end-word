/**
 * Compare an-array-of-english-words against WordNet (wordnet.ts) then NIKL Korean index.
 *
 * Run after Python index build:
 *   npx tsx scripts/en-ko-coverage-compare.ts --limit 10
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import words from "an-array-of-english-words";
import { WordNetDictionary } from "../src/app/server/dictionary/wordnet";
import { ENGLISH_MIN_WORD_LENGTH } from "../src/shared/consts";
import { normalizeEnglishWord } from "../src/shared/utils";

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? join(process.cwd(), "scripts", "output");
const INDEX_PATH =
    process.env.KOREAN_INDEX_PATH ?? join(OUTPUT_DIR, "korean-english-index.json");
const JSONL_PATH = join(OUTPUT_DIR, "en-ko-coverage.jsonl");
const SUMMARY_PATH = join(OUTPUT_DIR, "en-ko-coverage-summary.json");

export type CoverageGroup =
    | "wordnet_missing"
    | "wordnet_only"
    | "wordnet_and_korean";

export type CoverageRecord = {
    word: string;
    group: CoverageGroup;
    wordnet_found: boolean;
    korean_found: boolean;
    datasets: string[];
    definition_count: number;
};

function parseArgs(): { limit: number; concurrency: number } {
    const args = process.argv.slice(2);
    let limit = Number(process.env.LIMIT ?? 10);
    let concurrency = Number(process.env.WORDNET_CONCURRENCY ?? 32);

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--limit" && args[i + 1]) {
            limit = Number(args[++i]);
        } else if (args[i] === "--concurrency" && args[i + 1]) {
            concurrency = Number(args[++i]);
        }
    }

    return { limit, concurrency };
}

function loadEnglishWords(limit: number): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const raw of words) {
        const normalized = normalizeEnglishWord(raw);
        if (normalized.length < ENGLISH_MIN_WORD_LENGTH) continue;
        if (!/^[a-z]+$/.test(normalized)) continue;
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        result.push(normalized);
        if (limit > 0 && result.length >= limit) break;
    }

    return result;
}

function loadKoreanIndex(): Record<string, string[]> {
    const raw = readFileSync(INDEX_PATH, "utf8");
    return JSON.parse(raw) as Record<string, string[]>;
}

async function mapPool<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    async function worker(): Promise<void> {
        while (true) {
            const i = nextIndex++;
            if (i >= items.length) return;
            results[i] = await fn(items[i]!, i);
        }
    }

    const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        () => worker(),
    );
    await Promise.all(workers);
    return results;
}

function classify(
    word: string,
    wordnetFound: boolean,
    datasets: string[],
): CoverageRecord {
    const koreanFound = datasets.length > 0;
    let group: CoverageGroup;

    if (!wordnetFound) {
        group = "wordnet_missing";
    } else if (koreanFound) {
        group = "wordnet_and_korean";
    } else {
        group = "wordnet_only";
    }

    return {
        word,
        group,
        wordnet_found: wordnetFound,
        korean_found: koreanFound,
        datasets,
        definition_count: 0,
    };
}

async function main(): Promise<void> {
    const { limit, concurrency } = parseArgs();
    const wordLimit = limit === 0 ? 0 : limit;
    const englishWords = loadEnglishWords(wordLimit);

    console.log(`Loaded ${englishWords.length} English words (limit=${limit})`);
    console.log(`Loading Korean index from ${INDEX_PATH}`);

    const koreanIndex = loadKoreanIndex();
    const dict = new WordNetDictionary();

    const started = Date.now();
    let processed = 0;

    const records = await mapPool(englishWords, concurrency, async (word) => {
        const entry = await dict.lookup(word);
        const wordnetFound = entry !== null && entry.data.length > 0;
        const record = classify(
            word,
            wordnetFound,
            wordnetFound ? (koreanIndex[word] ?? []) : [],
        );
        record.definition_count = entry?.data.length ?? 0;

        processed++;
        if (processed % 500 === 0 || processed === englishWords.length) {
            console.log(`WordNet checked ${processed}/${englishWords.length}`);
        }

        return record;
    });

    mkdirSync(OUTPUT_DIR, { recursive: true });

    const jsonl = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
    writeFileSync(JSONL_PATH, jsonl, "utf8");

    const byGroup = {
        wordnet_missing: records.filter((r) => r.group === "wordnet_missing").length,
        wordnet_only: records.filter((r) => r.group === "wordnet_only").length,
        wordnet_and_korean: records.filter((r) => r.group === "wordnet_and_korean").length,
    };

    const summary = {
        checked: records.length,
        wordnet_found: records.filter((r) => r.wordnet_found).length,
        wordnet_missing: byGroup.wordnet_missing,
        korean_found: records.filter((r) => r.korean_found).length,
        korean_missing_among_wordnet: byGroup.wordnet_only,
        by_group: byGroup,
        index_tokens: Object.keys(koreanIndex).length,
        duration_sec: Math.round((Date.now() - started) / 100) / 10,
    };

    writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2), "utf8");

    console.log("Summary:", summary);
    console.log(`Wrote ${JSONL_PATH}`);

    const sampleMissing = records
        .filter((r) => r.group === "wordnet_missing")
        .slice(0, 15)
        .map((r) => r.word);
    const sampleWordnetOnly = records
        .filter((r) => r.group === "wordnet_only")
        .slice(0, 15)
        .map((r) => r.word);

    console.log("Sample wordnet_missing:", sampleMissing.join(", ") || "(none)");
    console.log("Sample wordnet_only:", sampleWordnetOnly.join(", ") || "(none)");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
