"""Build English-equivalent index from NIKL XML (krdict / opendict / stdict)."""

from __future__ import annotations

import json
import logging
import multiprocessing as mp
import re
from collections import defaultdict
from pathlib import Path
from typing import DefaultDict
from xml.etree import ElementTree as ET

from .normalize import normalize_english_word

logger = logging.getLogger(__name__)

DATASETS = ("krdict", "opendict", "stdict")
SPLIT_LEMMAS = re.compile(r"[;,]")


def _feat_val(parent: ET.Element, att: str) -> str | None:
    for feat in parent.findall("feat"):
        if feat.get("att") == att:
            return feat.get("val")
    return None


def _tokens_from_lemma(lemma: str) -> list[str]:
    tokens: list[str] = []
    for part in SPLIT_LEMMAS.split(lemma):
        normalized = normalize_english_word(part)
        if normalized:
            tokens.append(normalized)
    return tokens


def _process_xml_file(args: tuple[str, str]) -> dict[str, list[str]]:
    """Worker: parse one XML file; return {english_word: [dataset]}."""
    dataset, xml_path = args
    local: DefaultDict[str, set[str]] = defaultdict(set)
    path = Path(xml_path)
    if not path.is_file():
        logger.warning("Skipping missing file: %s", path)
        return {}

    logger.info("Parsing %s (%s)", path.name, dataset)
    try:
        context = ET.iterparse(path, events=("end",))
        for _event, elem in context:
            if elem.tag != "Equivalent":
                continue
            lang = _feat_val(elem, "language")
            if lang != "영어":
                elem.clear()
                continue
            lemma = _feat_val(elem, "lemma")
            if lemma:
                for token in _tokens_from_lemma(lemma):
                    local[token].add(dataset)
            elem.clear()
    except ET.ParseError as exc:
        logger.error("Skipping malformed XML %s (%s): %s", path.name, dataset, exc)
        return {}

    return {word: sorted(datasets) for word, datasets in local.items()}


def _merge_partial(
    merged: DefaultDict[str, set[str]], partial: dict[str, list[str]]
) -> None:
    for word, datasets in partial.items():
        merged[word].update(datasets)


def discover_xml_files(nikl_root: Path, datasets: tuple[str, ...] = DATASETS) -> list[tuple[str, str]]:
    files: list[tuple[str, str]] = []
    for dataset in datasets:
        dataset_dir = nikl_root / dataset
        if not dataset_dir.is_dir():
            logger.warning("Dataset directory missing: %s", dataset_dir)
            continue
        for xml_path in sorted(dataset_dir.glob("*.xml")):
            files.append((dataset, str(xml_path.resolve())))
    return files


def build_index_from_files(
    xml_files: list[tuple[str, str]],
    *,
    workers: int,
) -> dict[str, list[str]]:
    if not xml_files:
        raise FileNotFoundError("No XML files provided for indexing.")

    logger.info(
        "Indexing %s XML file(s) with %s worker(s)",
        len(xml_files),
        workers,
    )

    merged: DefaultDict[str, set[str]] = defaultdict(set)

    if workers <= 1:
        for item in xml_files:
            _merge_partial(merged, _process_xml_file(item))
    else:
        with mp.Pool(processes=workers) as pool:
            for partial in pool.imap_unordered(_process_xml_file, xml_files, chunksize=1):
                _merge_partial(merged, partial)

    return {word: sorted(datasets) for word, datasets in merged.items()}


def build_index(
    nikl_root: Path,
    *,
    workers: int,
    max_files: int | None = None,
) -> dict[str, list[str]]:
    xml_files = discover_xml_files(nikl_root)
    if max_files is not None:
        xml_files = xml_files[:max_files]

    if not xml_files:
        raise FileNotFoundError(
            f"No XML files under {nikl_root}/{{krdict,opendict,stdict}}. "
            "Clone https://github.com/spellcheck-ko/korean-dict-nikl or set --nikl-path."
        )

    return build_index_from_files(xml_files, workers=workers)


def save_index(index: dict[str, list[str]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    logger.info("Wrote index with %s English tokens to %s", len(index), path)


def load_index(path: Path) -> dict[str, list[str]]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)
