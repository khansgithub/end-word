"""Compare English word list against Korean English-equivalent index."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterator

logger = logging.getLogger(__name__)


@dataclass
class WordCoverage:
    word: str
    found: bool
    datasets: list[str]

    def to_jsonl(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)


def compare_words(
    english_words: list[str],
    korean_index: dict[str, list[str]],
) -> tuple[list[WordCoverage], dict[str, int]]:
    records: list[WordCoverage] = []
    stats = {"checked": 0, "found": 0, "missing": 0}

    for word in english_words:
        datasets = korean_index.get(word, [])
        found = bool(datasets)
        records.append(WordCoverage(word=word, found=found, datasets=datasets))
        stats["checked"] += 1
        if found:
            stats["found"] += 1
        else:
            stats["missing"] += 1

    return records, stats


def write_jsonl(records: list[WordCoverage], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(record.to_jsonl())
            f.write("\n")
    logger.info("Wrote %s JSONL records to %s", len(records), path)


def iter_jsonl(path: Path) -> Iterator[WordCoverage]:
    with path.open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            data = json.loads(line)
            yield WordCoverage(
                word=data["word"],
                found=data["found"],
                datasets=data.get("datasets", []),
            )
