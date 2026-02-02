- the trie is only indexing the dictionary form of verbs, not the conjugations
- could iterate through all WordForm under LexicalEntry to get all conjugations, although i don't want all conjugations, just the basic conjugation
    - this is where the analyser would come in use

- mecab-ko, kafiii are a pain in the arse to install.
    - the python mecab package doesn't work with 3.13
    - the official bindings requires you to build a bunch of rust packages from scratch
    - kafiii doesn't work on windows