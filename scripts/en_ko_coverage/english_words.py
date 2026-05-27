"""Load words from npm package an-array-of-english-words."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from .normalize import normalize_english_word

REPO_ROOT = Path(__file__).resolve().parents[2]
MIN_WORD_LENGTH = 4


def load_english_words(limit: int | None = None) -> list[str]:
    """
    Load normalized a-z words from an-array-of-english-words (>= MIN_WORD_LENGTH).
    Requires `npm install` so node_modules contains the package.
    """
    node_script = """
const words = require('an-array-of-english-words');
process.stdout.write(JSON.stringify(words));
"""
    try:
        raw = subprocess.check_output(
            ["node", "-e", node_script],
            cwd=REPO_ROOT,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise RuntimeError(
            "Failed to load an-array-of-english-words. Run: npm install"
        ) from exc

    all_words: list[str] = json.loads(raw)
    seen: set[str] = set()
    result: list[str] = []

    for word in all_words:
        normalized = normalize_english_word(word)
        if len(normalized) < MIN_WORD_LENGTH:
            continue
        if not normalized.isalpha():
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
        if limit is not None and len(result) >= limit:
            break

    return result


if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    words = load_english_words(limit)
    print(json.dumps({"count": len(words), "sample": words[:20]}))
