import marisa_trie

data = [
    {"key": "apple", "data": "a"},
    {"key": "banana", "data": "b"},
    {"key": "cherry", "data": "c"},
    {"key": "date", "data": "d"},
    {"key": "elderberry", "data": "e"},
    {"key": "fig", "data": "f"},
    {"key": "grape", "data": "g"},
    {"key": "honeydew", "data": "h"},
]

# keys = [ d["key"] for d in data ]


suffixed = [
    {"key": "-e", "data": ["cake", "bake", "free"]},
    {"key": "-ing", "data": ["running", "baking", "smiling"]},
    {"key": "-ed", "data": ["played", "mixed", "called"]},
    {"key": "-ly", "data": ["quickly", "softly", "brightly"]},
    {"key": "-ness", "data": ["kindness", "darkness", "illness"]},
    {"key": "-ful", "data": ["hopeful", "graceful", "colorful"]},
    {"key": "-tion", "data": ["action", "creation", "solution"]},
]


entries = [*data, *suffixed]

trie = marisa_trie.Trie([e["key"] for e in entries])

r = trie.get("apple")
r = data[trie.get("apple")]
print(r)
