import { lookUpWord } from "@/server/api";
import { DictionaryEntry, DictionaryResponse } from "@/shared/types";
import { isDictionaryEntry } from "@/shared/guards";

/**
 * Validates if a given input string is a valid word in the dictionary.
 * Makes an API call to check if the word exists in the dictionary.
 *
 * @param input - The word to validate
 * @returns Promise that resolves to true if the word is valid, false otherwise
 * @todo Add debounce to prevent excessive API calls
 * @todo Move API URL to constants
 */
export async function inputIsValid(input: string): Promise<[true, DictionaryEntry] | false > {
    // console.warn("skipping this for dev purposes");
    // return true
    if (input.length === 0) return false;

    // 1. Dictionary form (ending with '다') is invalid EXCEPT for certain nouns that end in 다, so check only pure verb/adjective patterns.
    // Heuristically, if the input length > 1 and ends with '다', it's likely a verb/adjective and thus should be rejected.
    if (input.length > 1 && input.endsWith("다")) {
        return false;
    }

    // 2. Politeness/formal endings: Disallow a broad range of polite/formal/casual verb endings.
    // "요" as a standalone will match any ending with "요", so entries that are just longer forms
    // ending in "요" are redundant. Only "요" is needed for this kind of filter.
    const politeEndings = [
        "요", "입니다", "니까", "십시오", "읍니다", "습니다"
    ];
    for (const ending of politeEndings) {
        if (input.endsWith(ending)) {
            return false;
        }
    }

    // const res = await fetch("http://localhost:8000/lookup/" + input);
    const res = await lookUpWord(input);
    const isValid = isDictionaryEntry(res);
    return isValid ? [true, res] : false;
}