#!/usr/bin/env bash
# Full NIKL + full English word list coverage run.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUTPUT_DIR="${OUTPUT_DIR:-$ROOT/scripts/output}"
mkdir -p "$OUTPUT_DIR"
LOG_FILE="$OUTPUT_DIR/en-ko-coverage-full.log"

PYTHON="${PYTHON:-python3}"
if [[ -x "$ROOT/dictionary/.venv/bin/python" ]]; then
  PYTHON="$ROOT/dictionary/.venv/bin/python"
fi

exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Full coverage run started at $(date -Iseconds) ==="
echo "Log: $LOG_FILE"

if [[ ! -d "$ROOT/vendor/korean-dict-nikl/krdict" ]]; then
  echo "Cloning korean-dict-nikl (shallow)..."
  mkdir -p "$ROOT/vendor"
  git clone --depth 1 https://github.com/spellcheck-ko/korean-dict-nikl.git "$ROOT/vendor/korean-dict-nikl"
else
  echo "Using existing NIKL clone at vendor/korean-dict-nikl"
fi

echo "=== Phase 1: Build Korean index (all NIKL XML) ==="
"$PYTHON" -m scripts.en_ko_coverage.main \
  --index-only \
  --output-dir "$OUTPUT_DIR" \
  "$@"

echo "=== Phase 2: WordNet + Korean compare (all English words) ==="
export OUTPUT_DIR
export KOREAN_INDEX_PATH="$OUTPUT_DIR/korean-english-index.json"
export LIMIT=0
export WORDNET_CONCURRENCY="${WORDNET_CONCURRENCY:-48}"
npx tsx "$ROOT/scripts/en-ko-coverage-compare.ts" --limit 0 --concurrency "$WORDNET_CONCURRENCY"

echo "=== Phase 3: Dashboard ==="
"$PYTHON" -m scripts.en_ko_coverage.main \
  --skip-index \
  --skip-compare \
  --output-dir "$OUTPUT_DIR"

echo "=== Full coverage run finished at $(date -Iseconds) ==="
