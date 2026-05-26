"""
Vercel Python entrypoint (api/index.py).

Routes under /api/dictionary/* avoid conflicting with Next.js /api/rooms, etc.
DICTIONARY_URL=https://<host>/api/dictionary
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_API_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _API_DIR.parent
_DICTIONARY_DIR = _REPO_ROOT / "dictionary"

os.environ.setdefault("DICTIONARY_DATA_DIR", str(_API_DIR / "data"))
sys.path.insert(0, str(_DICTIONARY_DIR))

from fastapi import FastAPI  # noqa: E402
from load_trie import get_dictionary  # noqa: E402

app = FastAPI(title="Korean Dictionary API (MARISA-backed)")


def _serialize_entry(result: object) -> dict:
    if result is None:
        return {}
    if isinstance(result, dict):
        return result
    if hasattr(result, "model_dump"):
        return result.model_dump()
    return dict(result)


@app.get("/api/dictionary/lookup/{word}")
def lookup(word: str):
    return _serialize_entry(get_dictionary().lookup(word))


@app.get("/api/dictionary/random")
def random_word():
    return _serialize_entry(get_dictionary().random())


@app.get("/api/dictionary/health")
def health():
    return {"status": "ok"}
