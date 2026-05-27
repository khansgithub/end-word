"""Coverage record types and JSONL I/O (WordNet + Korean groups)."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterator, Literal

logger = logging.getLogger(__name__)

CoverageGroup = Literal[
    "wordnet_missing",
    "wordnet_only",
    "wordnet_and_korean",
]


@dataclass
class WordCoverage:
    word: str
    group: CoverageGroup
    wordnet_found: bool
    korean_found: bool
    datasets: list[str]
    definition_count: int = 0

    def to_jsonl(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)


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
            # Legacy rows (pre-WordNet gate)
            if "group" not in data:
                found = data.get("found", False)
                datasets = data.get("datasets", [])
                group: CoverageGroup = (
                    "wordnet_and_korean" if found else "wordnet_only"
                )
                yield WordCoverage(
                    word=data["word"],
                    group=group,
                    wordnet_found=True,
                    korean_found=found,
                    datasets=datasets,
                    definition_count=0,
                )
                continue
            yield WordCoverage(
                word=data["word"],
                group=data["group"],
                wordnet_found=data["wordnet_found"],
                korean_found=data["korean_found"],
                datasets=data.get("datasets", []),
                definition_count=data.get("definition_count", 0),
            )
