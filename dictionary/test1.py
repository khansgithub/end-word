import marisa_trie

data = [
    { "key": "a", "data": "apple" },
    { "key": "b", "data": "banana" },
    { "key": "c", "data": "cherry" },
    { "key": "d", "data": "date" },
    { "key": "e", "data": "elderberry" },
    { "key": "f", "data": "fig" },
    { "key": "g", "data": "grape" },
    { "key": "h", "data": "honeydew" }
];

# keys = [ d["key"] for d in data ]


suffixed = [
    { "key": "-e",  "data": ["cake", "bake", "free"] },
    { "key": "-ing", "data": ["running", "baking", "smiling"] },
    { "key": "-ed",  "data": ["played", "mixed", "called"] },
    { "key": "-ly",  "data": ["quickly", "softly", "brightly"] },
    { "key": "-ness","data": ["kindness", "darkness", "illness"] },
    { "key": "-ful", "data": ["hopeful", "graceful", "colorful"] },
    { "key": "-tion","data": ["action", "creation", "solution"] }
];


entries = [*data, *suffixed]

trie = marisa_trie.Trie([e["key"] for e in entries])
