from __future__ import annotations

import os
import random
from pathlib import Path

import marisa_trie
import orjson
from models import Entry


def _data_dir() -> Path:
    override = os.environ.get("DICTIONARY_DATA_DIR")
    if override:
        return Path(override)
    return Path(__file__).resolve().parent / "data"


TRIE_PATH = _data_dir() / "dict.marisa"
META_PATH = _data_dir() / "metadata.jsonl"


class Dictionary:
    def __init__(self):
        self.trie = marisa_trie.Trie()
        self.trie.load(TRIE_PATH)

        # Load metadata into a list indexed by trie ID
        self.metadata: list[Entry] = []
        with open(META_PATH, "r", encoding="utf8") as f:
            for line in f:
                self.metadata.append(orjson.loads(line))

    def lookup(self, word: str) -> Entry | None:
        index = self.trie.get(word)
        if index is None:
            return None

        # marisa-trie stores index directly
        return self.metadata[index]

    def prefix_search(self, prefix: str, limit=20):
        results = []
        for key, id_ in zip(
            self.trie.keys(prefix),
            self.trie.values(prefix)
        ):
            results.append({
                "lemma": key,
                "entry": self.metadata[id_]
            })
            if len(results) >= limit:
                break
        return results
    
    def random(self):
        return self.metadata[random.randint(0, len(self.metadata) - 1)]


_dictionary: Dictionary | None = None


def get_dictionary() -> Dictionary:
    global _dictionary
    if _dictionary is None:
        _dictionary = Dictionary()
    return _dictionary


class _DictionaryProxy:
    """Lazy singleton used by local `dictionary/main.py`."""

    def lookup(self, word: str) -> Entry | None:
        return get_dictionary().lookup(word)

    def random(self) -> Entry:
        return get_dictionary().random()


dictionary = _DictionaryProxy()