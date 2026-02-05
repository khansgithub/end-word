# build_trie.py
"""
Build a MARISA trie and JSONL metadata from Korean dictionary XML files.
Entry point: build()
"""
import glob
import json
import os
from xml.etree import ElementTree as ET
from xml.etree.ElementTree import Element

from collections import namedtuple
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, cast

from models import Entry, EntryDataEng

import marisa_trie
from functools import cache

import logging
from logging import getLogger
from rich.logging import RichHandler

rich_handler = RichHandler(show_time=True, show_level=True, show_path=True)
logger = getLogger(__name__)
logger.addHandler(rich_handler)
logger.setLevel(logging.INFO)


DATA_DIR = Path(__file__).parent / "data"
TRIE_FILE = "data/dict.marisa"
META_FILE = "data/metadata.jsonl"
CUSTOM_DICT_FILE = "data/custom_dict.json"

# XPath expressions for dictionary XML
PartOfSpeechXPath = "./feat[@att='partOfSpeech']"
WrittenFormXPath = "./Lemma/feat[@att='writtenForm']"
SenseEnglishXPath = "./Equivalent/feat[@val='영어']/.."

PosFilter = ["명사"]  # , "동사"]

# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def build():
    """
    Parse XML sources, build MARISA trie, and write trie + metadata to disk.
    """
    Path("data").mkdir(exist_ok=True)

    entries = parse_entries()
    logger.info(f"Parsed {len(entries)} entries.")

    # Sort by lemma for consistent trie ordering
    entries.sort(key=lambda e: e.key)
    keys = [e.key for e in entries]

    # Build MARISA trie and persist
    trie = marisa_trie.Trie(keys)
    # TODO: Rebuild the meta data, using the indicies from list(trie)
    trie.save(TRIE_FILE)

    # Reorder metadata to match trie key order (MARISA sort ≠ Python sort)
    entries = rebuild_entries(trie, entries)

    # Write one JSON object per line (JSONL)
    with open(META_FILE, "w", encoding="utf8") as f:
        for entry in entries:
            f.write(json.dumps(entry.model_dump(), ensure_ascii=False))
            f.write("\n")

    logger.info("Trie and metadata built successfully.")


# ---------------------------------------------------------------------------
# Parsing: files → entries
# ---------------------------------------------------------------------------

def get_val(e: Element | None) -> str | None:
    if e is None:
        return None
    return e.attrib.get("val")

def parse_entries() -> list[Entry]:
    """
    Discover XML files in DATA_DIR and collect all lexical entries.
    """
    if not DATA_DIR.exists():
        logger.debug(DATA_DIR.as_posix(), "does not exist")
        return []

    files = glob.glob("*.xml", root_dir=DATA_DIR.as_posix())
    entries: list[Entry] = []

    for file in files:
        logger.info(f"Parsing file: {file}")
        tree = ET.parse(DATA_DIR / file)
        root = tree.getroot()
        for lexical_entry in root.findall(".//LexicalEntry"):
            unit = get_val(lexical_entry.find("./feat[@att='lexicalUnit']"))
            if unit != "단어":
                logger.debug(f"skipping the word entry because it is not a word")
                continue
            logger.debug(f"parsing the word entry")
            parse_lexical_entry(lexical_entry, entries)
            # input("Press Enter to continue...")
    
    # Read custom dictionary and merge entries
    custom_dict_path = CUSTOM_DICT_FILE
    if os.path.exists(custom_dict_path):
        with open(custom_dict_path, "r", encoding="utf8") as f:
            custom_dict = json.load(f)
            for word, definition in custom_dict.items():
                # Check if word already exists in entries
                if not any(entry.key == word for entry in entries):
                    entries.append(Entry(
                        key=word,
                        data=[EntryDataEng(word=word, definition=definition)]
                    ))

    return entries


def parse_lexical_entry(lexical_entry: Element, entries: list[Entry]):
    """
    Turn one LexicalEntry XML element into an Entry and append to entries.
    """
    if not filter_by_pos(lexical_entry, PosFilter):
        logger.debug(f"skipping the word entry because it is not a type of {PosFilter}")
        return

    lemma = get_val(lexical_entry.find(WrittenFormXPath))
    if lemma is None:
        return

    if len(lemma) < 2:
        logger.debug(f"skipping the word entry because it is too short: {lemma}")
        return

    if filter_by_pos(lexical_entry, ["동사"]):
        stem = get_verb_stem(lexical_entry)

    senses: list[EntryDataEng] = get_english_defs(lexical_entry)
    if len(senses) == 0:
        logger.info(f"skipping the word entry because it has no English definitions: {lemma}")
        return
    logger.debug(f"adding the word <{lemma}>")
    entries.append(Entry(key=str(lemma), data=senses))


# ---------------------------------------------------------------------------
# Parsing helpers: XML → parts of an entry
# ---------------------------------------------------------------------------


def get_english_defs(lexical_entry: Element) -> list[EntryDataEng]:
    """
    Extract English sense definitions for 명사/동사 from a LexicalEntry.
    """
    senses: list[EntryDataEng] = []
    for sense in lexical_entry.findall("./Sense"):
        def_node = sense.find("./feat[@att='definition']")

        if not filter_by_pos(lexical_entry, PosFilter):
            continue

        eng_def_node = sense.find(SenseEnglishXPath)
        if eng_def_node is None:
            continue

        eng_lemma = eng_def_node.find("./feat[@att='lemma']")
        eng_def = eng_def_node.find("./feat[@att='definition']")
        if eng_lemma is None or eng_def is None:
            continue

        english_definition = EntryDataEng(
            word=get_val(eng_lemma) or "None",
            definition=get_val(eng_def) or "Error",
        )

        logger.debug(f"adding the word <{english_definition}>")

        senses.append(english_definition)
    return senses


def get_verb_stem(lexical_entry: Element) -> str | None:
    """
    Get the shortest 활용 (conjugation) form as the verb stem.
    """
    forms = []
    for word_form in lexical_entry.findall("./WordForm"):
        if get_val(word_form.find("./feat[@att='type']")) != "활용":
            continue
        
        form = get_val(word_form.find(WrittenFormXPath))
        if form: forms.append(form)
    # The stem is (probably) the shortest form
    stem = min(forms, key=len) if forms else None
    return stem


def filter_by_pos(lexical_entry: Element, pos: list[str]) -> bool:
    """
    True if the LexicalEntry's part of speech is in the given list (e.g. 명사, 동사).
    """
    part_of_speech = get_val(lexical_entry.find(PartOfSpeechXPath))
    logger.debug(f"part of speech: {part_of_speech}")
    if not part_of_speech:
        # Serialize the XML of lexical_entry for debugging purposes
        logger.debug(ET.tostring(lexical_entry, encoding='unicode'))
        return False
    return part_of_speech in pos


# ---------------------------------------------------------------------------
# Trie & metadata ordering
# ---------------------------------------------------------------------------


def rebuild_entries(trie: marisa_trie.Trie, enteries: list[Entry]) -> list[Entry]:
    """
    Rebuild the metadata, in the order that the marisa-trie ordered them.
    The `sort` used by marisa-trie internally is not the same as the python `sort`.

    :param trie:
    :type trie: marisa-trie
    :param enteries: metadata
    :type enteries: list
    :return: new metadata list in the same order as the keys in the trie
    :rtype: list[Entry]
    """

    # TODO: Implment some in-place sorting algorithm here
    # import ipdb; ipdb.set_trace()
    sorted_entries: list[Entry | None] = [None] * len(enteries)
    for e in enteries:
        key = e.key
        new_index = trie.get(key)
        try:
            sorted_entries[new_index] = e
        except IndexError as e:
            logger.debug(f"Unexpected Index {new_index=}- out of bounds {len(enteries)=}")
            raise e

    return cast(list[Entry], sorted_entries)


# ---------------------------------------------------------------------------
# Script entry
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    try:
        build()
    except KeyboardInterrupt:
        print("\nBuild cancelled by user (Ctrl+C).")
