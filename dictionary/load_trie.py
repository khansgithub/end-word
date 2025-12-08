# api/trie_loader.py
from build_trie import Entry
import marisa_trie
import orjson

TRIE_PATH = "data/dict.marisa"
META_PATH = "data/metadata.jsonl"


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
        import ipdb; ipdb.set_trace()
        
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


dictionary = Dictionary()

def p():
    prefix = "-가"
    t = dictionary.trie
    p = t.keys(prefix)
    p = t.get(prefix)
    print(p)
    import ipdb; ipdb.set_trace()
    # results = zip(p, [dictionary.metadata[t.get(p_)] for p_ in p])
    # print(list(results))

def q():
    t = dictionary.trie
    r = t.keys()[0]
    r = t.get(r)
    import ipdb; ipdb.set_trace()
    print(r)

# p()