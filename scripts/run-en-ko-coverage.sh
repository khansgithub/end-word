#!/usr/bin/env bash
# Run English coverage: NIKL index → WordNet (wordnet.ts) → Korean match → dashboard.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUTPUT_DIR="${OUTPUT_DIR:-$ROOT/scripts/output}"
mkdir -p "$OUTPUT_DIR"

LOG_FILE="$OUTPUT_DIR/en-ko-coverage.log"
EXTRA_ARGS=("$@")

if [[ ${#EXTRA_ARGS[@]} -eq 0 ]]; then
  EXTRA_ARGS=(--use-local-data --max-xml-files 1 --limit 10)
fi

echo "Logging to $LOG_FILE (and stdout). Use: tail -f $LOG_FILE"
echo "Args: ${EXTRA_ARGS[*]}"

PYTHON="${PYTHON:-python3}"
if [[ -x "$ROOT/dictionary/.venv/bin/python" ]]; then
  PYTHON="$ROOT/dictionary/.venv/bin/python"
fi

set -o pipefail
"$PYTHON" -m scripts.en_ko_coverage.main "${EXTRA_ARGS[@]}" 2>&1 | tee -a "$LOG_FILE"
exit "${PIPESTATUS[0]}"
