# English ↔ Korean (NIKL) coverage

Compares words from npm [`an-array-of-english-words`](https://www.npmjs.com/package/an-array-of-english-words) against English `<Equivalent language="영어">` lemmas in [spellcheck-ko/korean-dict-nikl](https://github.com/spellcheck-ko/korean-dict-nikl) (`krdict`, `opendict`, `stdict`).

Normalization matches `normalizeEnglishWord()` (lowercase, strip non-`a-z`).

## Quick dry-run (default)

Uses one local `dictionary/data/*.xml` file and **10** English words:

```bash
npm install
npm run dict:coverage
```

Logs: `scripts/output/en-ko-coverage.log` (also printed via `tee`).

Outputs:

- `scripts/output/en-ko-coverage.jsonl` — one JSON object per word
- `scripts/output/en-ko-coverage-summary.json` — counts
- `scripts/output/en-ko-coverage-dashboard.html` — interactive filter/search UI
- `scripts/output/korean-english-index.json` — cached English→datasets index

## Full run (NIKL clone)

```bash
# First run clones vendor/korean-dict-nikl (large download)
python3 -m scripts.en_ko_coverage.main --limit 0

# Reuse index on later runs
python3 -m scripts.en_ko_coverage.main --skip-index --limit 0
```

Or after clone exists:

```bash
npm run dict:coverage:full
```

## Useful flags

| Flag | Purpose |
|------|---------|
| `--limit N` | Check first N words (`0` = all) |
| `--use-local-data` | Index `dictionary/data/*.xml` only |
| `--max-xml-files 1` | Cap XML files (fast tests) |
| `--workers N` | Parallel XML parsers (default: CPU−1) |
| `--skip-clone` | Do not `git clone` NIKL repo |
| `--skip-index` | Reuse `korean-english-index.json` |
| `--verbose` | DEBUG logs |

Monitor logs while running:

```bash
tail -f scripts/output/en-ko-coverage.log
```
