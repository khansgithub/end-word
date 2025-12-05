# build_trie.py
from dataclasses import dataclass
import json
from typing import Any
from xml.dom.minidom import Element
import marisa_trie
import xml.etree.ElementTree as ET
from pathlib import Path


XML_FILE = "data/5000.xml"
TRIE_FILE = "data/dict.marisa"
META_FILE = "data/metadata.jsonl"
   
i = 0
prev_word = ""
def parse_entries(xml_file):
    global i
    tree = ET.parse(xml_file)
    root = tree.getroot()

    entries = []
    for entry in root.findall(".//LexicalEntry"):
        i = i + 1
        lemma_node = entry.find("./Lemma/feat[@att='writtenForm']")
        if lemma_node is None:
            continue

        lemma = lemma_node.attrib["val"]

        senses = []
        for sense in entry.findall("./Sense"):
            def_node = sense.find("./feat[@att='definition']")
            definition = def_node.attrib["val"] if def_node is not None else None

            # .//Lexicon/LexicalEntry/Sense[@val=1]/Equivalent/feat[@val='영어']/following-sibling::*
            eng_def_node = sense.find("./Equivalent/feat[@val='영어']/..")
            if (eng_def_node is None): continue

            eng_lemma = eng_def_node.find("./feat[@att='lemma']")
            eng_def = eng_def_node.find("./feat[@att='definition']")
            if (eng_lemma is None): continue
            if (eng_def is None): continue

            english_definition = {
                "lemma": eng_lemma.attrib.get("val") or "None",
                "definition": eng_def.attrib.get("val")
            }

            if (None in english_definition.values()):
                print(i)
                print(lemma)
                import ipdb; ipdb.set_trace()
                # print("prev word", prev_word)
                # print(definition)
                # there are some entries which seem to be empty
                # print(f"{eng_lemma.text}")
                # print(f"{eng_def.text=}")
                # print(eng_def_node.attrib)
                # print(i, entry.text)
                # print(entry.attrib)
                continue

            prev_word = lemma_node.attrib["val"]


            examples = []
            for ex in sense.findall("./SenseExample"):
                e = ex.find("./feat[@att='example']")
                if e is not None:
                    examples.append(e.attrib["val"])

            senses.append({
                "eng": english_definition,
                "definition": definition,
                "examples": examples,
            })      

        entries.append({"lemma": lemma, "senses": senses})

    return entries


def build():
    Path("data").mkdir(exist_ok=True)

    entries = parse_entries(XML_FILE)
    print(f"Parsed {len(entries)} entries.")

    # sort by lemma
    entries.sort(key=lambda e: e["lemma"])

    keys = [e["lemma"] for e in entries]

    # build MARISA trie
    trie = marisa_trie.Trie(keys)
    trie.save(TRIE_FILE)

    # write metadata
    with open(META_FILE, "w", encoding="utf8") as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False))
            f.write("\n")

    print("Trie and metadata built successfully.")

def unexpected_missing_value(context: Any):
    ...

if __name__ == "__main__":
    build()
