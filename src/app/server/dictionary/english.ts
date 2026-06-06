import { WordNetDictionary } from "@/app/server/dictionary/wordnet";

const wordNetEnglish = new WordNetDictionary();
export const dictionary = wordNetEnglish;