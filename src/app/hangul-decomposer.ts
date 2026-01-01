// hangul-decomposer.ts

/**
 * Hangul Jamo decomposition module
 * Author: ChatGPT
 * 
 * Decomposes Hangul syllables into initial consonant (Choseong),
 * vowel (Jungseong), and final consonant (Jongseong) components.
 */

/** Initial consonants (Choseong) */
export const INITIALS = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ",
    "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ",
    "ㅌ", "ㅍ", "ㅎ"
] as const;

/** Vowels (Jungseong) */
export const VOWELS = [
    "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ",
    "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ",
    "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"
] as const;

/** Final consonants (Jongseong) */
export const FINALS = [
    "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ",
    "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ",
    "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ",
    "ㅋ", "ㅌ", "ㅍ", "ㅎ"
] as const;

/** Types for Jamo */
export type Initial = typeof INITIALS[number];
export type Vowel = typeof VOWELS[number];
export type Final = typeof FINALS[number];
export type Jamo = Initial | Vowel | Final;
export type JamoOrOther = Jamo | string;

/** Decomposed Hangul syllable: [initial, vowel, final?] */
export type DecomposedSyllable = JamoOrOther[];

/** Unicode constants */
const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const NUM_INITIALS = INITIALS.length;
const NUM_VOWELS = VOWELS.length;
const NUM_FINALS = FINALS.length;
const SYLLABLES_PER_INITIAL = NUM_VOWELS * NUM_FINALS;

/**
 * Decomposes a single Hangul syllable into its constituent Jamo.
 * Returns the original character if it is not a Hangul syllable.
 * 
 * @param syllable Single character string
 * @returns Array of Jamo characters ([initial, vowel, final?])
 */
export function decomposeSyllable(syllable: string): DecomposedSyllable {
    if (!syllable || syllable.length !== 1) return [syllable];

    const code = syllable.charCodeAt(0);
    if (code < HANGUL_BASE || code > HANGUL_END) return [syllable];

    const index = code - HANGUL_BASE;
    const initial = INITIALS[Math.floor(index / SYLLABLES_PER_INITIAL)];
    const vowel = VOWELS[Math.floor((index % SYLLABLES_PER_INITIAL) / NUM_FINALS)];
    const final = FINALS[index % NUM_FINALS];

    return final ? [initial, vowel, final] : [initial, vowel];
}

/**
 * Decomposes a full word (string) into an array of Jamo characters.
 * Non-Hangul characters are returned as-is.
 * 
 * @param word Word to decompose
 * @returns Flattened array of Jamo or original characters
 */
export function decomposeWord(word: string | null | undefined): JamoOrOther[] {
    if (!word) return [];
    const result: JamoOrOther[] = [];
    for (const char of word) {
        result.push(...decomposeSyllable(char));
    }
    return result;
}

/**
 * Decomposes a full word into grouped syllables.
 * Each syllable is represented as [initial, vowel, final?].
 * 
 * @param word Word to decompose
 * @returns Array of decomposed syllables
 */
export function decomposeWordGrouped(word: string | null | undefined): DecomposedSyllable[] {
    if (!word) return [];
    return Array.from(word, decomposeSyllable);
}

/**
 * Returns all building steps of a Hangul syllable.
 * For example, '밥' -> ['ㅂ', '바', '밥']
 * Non-Hangul characters are returned as-is.
 * 
 * @param syllable Single character string
 */
export function buildSyllableSteps(syllable: string): string[] {
    const decomposed = decomposeSyllable(syllable);
    
    // If it's not a Hangul syllable, return the character itself
    if (decomposed.length === 1 && decomposed[0] === syllable) {
        return [syllable];
    }

    const [initial, vowel, final] = decomposed as [Initial, Vowel, Final?];
    const steps: string[] = [];

    // Step 1: Initial consonant
    steps.push(initial);

    // Step 2: Initial + vowel
    const initialVowel = String.fromCharCode(
        HANGUL_BASE + 
        INITIALS.indexOf(initial) * SYLLABLES_PER_INITIAL + 
        VOWELS.indexOf(vowel) * NUM_FINALS
    );
    steps.push(initialVowel);

    // Step 3: Full syllable (with final if exists)
    if (final) {
        steps.push(syllable);
    }

    return steps;
}

/**
 * Checks if the given input is a Hangul double (complex) consonant or vowel,
 * such as ㅆ, ㄲ, ㅄ, etc.
 * Optionally accepts a 'type' parameter ('initial', 'final', or 'both').
 * 
 * @param letter The letter to check
 * @param type Optional: restricts check to only double initial, double final, or both
 * @returns true if it's a double letter, false otherwise
 */
export function isDoubleLetter(
    letter: string,
    type: "initial" | "final" | "both" = "both"
): boolean {
    // Representative double initial consonants in Hangul
    const doubleInitialConsonants = [
        "ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"
    ];
    // Representative double final consonants in Hangul (complex batchim)
    const doubleFinalConsonants = [
        "ㄳ", "ㄵ", "ㄶ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅄ", "ㅆ"
    ];

    // Double vowels (diphthongs) technically exist (like ㅒ, ㅖ, ㅘ, etc.),
    // but "double letter" usually refers to consonants in Hangul.
    // If needed, add double vowels here.

    if (type === "initial") {
        return doubleInitialConsonants.includes(letter);
    }
    if (type === "final") {
        return doubleFinalConsonants.includes(letter);
    }
    // type == "both"
    return doubleInitialConsonants.includes(letter) || doubleFinalConsonants.includes(letter);
}


// /**
//  * Example standalone usage
//  */
// async function main() {
//     console.log("decomposeWord('가방'):", decomposeWord("가방"));
//     console.log("decomposeWordGrouped('가방'):", decomposeWordGrouped("가방"));
//     console.log("decomposeWord('값'):", decomposeWord("값"));
//     console.log("decomposeWordGrouped('안녕하세요'):", decomposeWordGrouped("안녕하세요"));
// }

// // Run if executed directly
// if (typeof process !== "undefined" && import.meta.url === `file://${process.argv[1]}`) {
//     main();
// }
