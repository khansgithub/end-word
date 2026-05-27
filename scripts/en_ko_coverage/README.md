# English coverage: WordNet → Korean (NIKL)

For each word in [`an-array-of-english-words`](https://www.npmjs.com/package/an-array-of-english-words):

1. **WordNet** — `WordNetDictionary` in `src/app/server/dictionary/wordnet.ts` must return a definition.
2. **Korean (NIKL)** — only if step 1 succeeds, check English `<Equivalent language="영어">` lemmas in [korean-dict-nikl](https://github.com/spellcheck-ko/korean-dict-nikl).

## Report groups

| Group | Meaning |
|--------|---------|
| `wordnet_missing` | No definition in WordNet (Korean lookup skipped) |
| `wordnet_only` | WordNet definition exists, not in Korean index |
| `wordnet_and_korean` | WordNet + at least one NIKL dataset (`krdict`, `opendict`, `stdict`) |

## Quick dry-run (default)

One local XML file, 10 English words:

```bash
npm install
npm run dict:coverage
```

Outputs under `scripts/output/`:

- `en-ko-coverage.jsonl` — one record per word (includes `group`)
- `en-ko-coverage-summary.json` — counts by group
- `en-ko-coverage-dashboard.html` — filter by group / dataset
- `korean-english-index.json` — cached Korean→English index

Monitor logs:

```bash
tail -f scripts/output/en-ko-coverage.log
```

## Pipeline

1. **Python** — parallel XML index (`scripts/en_ko_coverage/`)
2. **TypeScript** — `scripts/en-ko-coverage-compare.ts` (WordNet lookups + index lookup)
3. **Python** — HTML dashboard from JSONL

## Full run

```bash
python3 -m scripts.en_ko_coverage.main --limit 0 --skip-index
# first time: omit --skip-index to build index from vendor/korean-dict-nikl
```

## Flags

| Flag | Purpose |
|------|---------|
| `--limit N` | Words to check (`0` = all) |
| `--use-local-data` | Index `dictionary/data/*.xml` only |
| `--max-xml-files 1` | Cap XML files (fast tests) |
| `--skip-index` | Reuse `korean-english-index.json` |
| `--index-only` | Build index only |
| `--skip-compare` | Regenerate dashboard from existing JSONL |

Compare-only (index already built):

```bash
npx tsx scripts/en-ko-coverage-compare.ts --limit 100
python3 -m scripts.en_ko_coverage.main --skip-index --skip-compare
```
