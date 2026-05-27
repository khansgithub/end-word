"""Match normalizeEnglishWord() from the game dictionary."""

import re

_NON_ALPHA = re.compile(r"[^a-z]")


def normalize_english_word(word: str) -> str:
    return _NON_ALPHA.sub("", word.strip().lower())
