"""
Vercel Python entrypoint (api/index.py).

Routes under /api/dictionary/* avoid conflicting with Next.js /api/rooms, etc.
DICTIONARY_URL=https://<host>/api/dictionary
"""
from __future__ import annotations

import sys
from pathlib import Path

_DICTIONARY_DIR = Path(__file__).resolve().parent.parent / "dictionary"
sys.path.insert(0, str(_DICTIONARY_DIR))

from main import create_app  # noqa: E402

app = create_app("/api/dictionary")
