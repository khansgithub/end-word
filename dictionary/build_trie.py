# build_trie.py
import glob
import json
import os
import xml.etree.ElementTree as ET
from collections import namedtuple
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, TypedDict, cast
from xml.dom.minidom import Element

import marisa_trie

# TODO: Generate pydantic types for this, or even venture into using cue for making schemas
class EntryDataEng(TypedDict):
    word: str
    definition: str

class Entry(TypedDict):
    key: str
    data: list[EntryDataEng]


DATA_DIR = Path(__file__).parent / "data"
TRIE_FILE = "data/dict.marisa"
META_FILE = "data/metadata.jsonl"

def parse_entries() -> list:
    if not DATA_DIR.exists():
        print(DATA_DIR.as_posix(), "does not exist")
        return []
    
    files = glob.glob('*.xml', root_dir=DATA_DIR.as_posix())
    entries: list[Entry] = []
    
    for file in files:
        print("Parsing file:", file)
        tree = ET.parse(DATA_DIR / file)
        root = tree.getroot()
        for lexical_entry in root.findall(".//LexicalEntry"):
            is_word = lexical_entry.find("./feat[@att='lexicalUnit']").attrib.get("val") == "단어"
            if not is_word: continue
            
            part_of_speech = lexical_entry.find("./Lemma/feat[@att='partOfSpeech']").attrib.get("val")
            if part_of_speech not in ["명사", "동사"]: continue

            lemma = lexical_entry.find("./Lemma/feat[@att='writtenForm']").attrib.get("val")
            if lemma is None: continue

            if part_of_speech == "명사":
                forms = []
                for word_form in lexical_entry.findall("./WordForm"):
                    if word_form.find("./feat[@att='type']").attrib.get("val") != "활용": continue
                    
                    forms.append(
                        word_form.find("./feat[@att='writtenForm']").attrib.get("val")
                    )
                # the stem is (probably) the shortest form
                stem = min(forms, key=len)

            senses: list[EntryDataEng] = []
            for sense in lexical_entry.findall("./Sense"):
                def_node = sense.find("./feat[@att='definition']")
 
                if part_of_speech not in ["명사", "동사"]: continue
                # .//Lexicon/LexicalEntry/Sense[@val=1]/Equivalent/feat[@val='영어']/following-sibling::*
                eng_def_node = sense.find("./Equivalent/feat[@val='영어']/..")
                if (eng_def_node is None): continue

                eng_lemma = eng_def_node.find("./feat[@att='lemma']")
                eng_def = eng_def_node.find("./feat[@att='definition']")
                if (eng_lemma is None): continue
                if (eng_def is None): continue

                english_definition = EntryDataEng({
                    "word": eng_lemma.attrib.get("val") or "None",
                    "definition": eng_def.attrib.get("val") or "Error"
                })

                print(f"adding the word <{lemma}>")

                senses.append(english_definition)      

            entries.append({"key": lemma, "data": senses})

    return entries


def build():
    Path("data").mkdir(exist_ok=True)

    entries = parse_entries()
    print(f"Parsed {len(entries)} entries.")

    # sort by lemma
    entries.sort(key=lambda e: e["key"])

    keys = [e["key"] for e in entries]

    # build MARISA trie
    trie = marisa_trie.Trie(keys)
    # TODO: Rebuild the meta data, using the indicies from list(trie)
    trie.save(TRIE_FILE)

    entries = rebuild_entries(trie, entries)

    # write metadata
    with open(META_FILE, "w", encoding="utf8") as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False))
            f.write("\n")

    print("Trie and metadata built successfully.")


def rebuild_entries(trie: marisa_trie.Trie, enteries: list[Entry]) -> list[Entry]:
    '''
    Rebuild the metadata, in the order that the marisa-trie ordered them.
    The `sort` used by marisa-trie internally is not the same as the python `sort`.
    
    :param trie: 
    :type trie: marisa-trie
    :param enteries: metadata
    :type enteries: list
    :return: new metadata list in the same order as the keys in the trie
    :rtype: list[Entry]
    '''

    # TODO: Implment some in-place sorting algorithm here
    # import ipdb; ipdb.set_trace()
    sorted_entries: list[Entry | None] = [None] * len(enteries)
    for e in enteries:
        key = e["key"]
        new_index = trie.get(key)
        try:
            sorted_entries[new_index] = e
        except IndexError as e:
            print(f"Unexpected Index {new_index=}- out of bounds {len(enteries)=}")
            raise e

    return cast(list[Entry], sorted_entries)

if __name__ == "__main__":
    build()


