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

// Mapping of double consonants and vowels to their constituent characters
const DOUBLE_SYLLABLE_MAP: Record<string, [string, string]> = {
    // Double initial consonants (same character doubled)
    "ㄲ": ["ㄱ", "ㄱ"],
    "ㄸ": ["ㄷ", "ㄷ"],
    "ㅃ": ["ㅂ", "ㅂ"],
    "ㅆ": ["ㅅ", "ㅅ"],
    "ㅉ": ["ㅈ", "ㅈ"],
    // Complex final consonants (different characters)
    "ㄳ": ["ㄱ", "ㅅ"],
    "ㄵ": ["ㄴ", "ㅈ"],
    "ㄶ": ["ㄴ", "ㅎ"],
    "ㄺ": ["ㄹ", "ㄱ"],
    "ㄻ": ["ㄹ", "ㅁ"],
    "ㄼ": ["ㄹ", "ㅂ"],
    "ㄽ": ["ㄹ", "ㅅ"],
    "ㄾ": ["ㄹ", "ㅌ"],
    "ㄿ": ["ㄹ", "ㅍ"],
    "ㅀ": ["ㄹ", "ㅎ"],
    "ㅄ": ["ㅂ", "ㅅ"],
    // Double vowels (diphthongs)
    "ㅘ": ["ㅗ", "ㅏ"],
    "ㅙ": ["ㅗ", "ㅐ"],
    "ㅚ": ["ㅗ", "ㅣ"],
    "ㅝ": ["ㅜ", "ㅓ"],
    "ㅞ": ["ㅜ", "ㅔ"],
    "ㅟ": ["ㅜ", "ㅣ"],
    "ㅢ": ["ㅡ", "ㅣ"],
    // Y-sound vowels (composed vowels)
    "ㅑ": ["ㅣ", "ㅏ"],
    "ㅒ": ["ㅣ", "ㅐ"],
    "ㅕ": ["ㅣ", "ㅓ"],
    "ㅖ": ["ㅣ", "ㅔ"],
    "ㅛ": ["ㅣ", "ㅗ"],
    "ㅠ": ["ㅣ", "ㅜ"],
};

/**
 * Non-recursive decomposition helper. Decomposes a syllable into components without
 * further decomposing double syllables in those components.
 * This is useful for functions that need to work with intermediate components.
 * 
 * @param syllable Single character string
 * @returns Array of Jamo characters ([initial, vowel, final?] for regular syllables, [char1, char2] for double syllables, or [original] for non-Hangul)
 */
export function decomposeSyllableNonRecursive(syllable: string): DecomposedSyllable {
    if (!syllable || syllable.length !== 1) return [syllable];

    // First check for double syllables (fast O(1) map lookup)
    const doubleDecomp = DOUBLE_SYLLABLE_MAP[syllable];
    if (doubleDecomp) {
        return doubleDecomp;
    }

    // Fall through to regular Hangul syllable decomposition
    const code = syllable.charCodeAt(0);
    if (code < HANGUL_BASE || code > HANGUL_END) return [syllable];

    const index = code - HANGUL_BASE;
    const initial = INITIALS[Math.floor(index / SYLLABLES_PER_INITIAL)];
    const vowel = VOWELS[Math.floor((index % SYLLABLES_PER_INITIAL) / NUM_FINALS)];
    const final = FINALS[index % NUM_FINALS];

    return final ? [initial, vowel, final] : [initial, vowel];
}

/**
 * Decomposes a single Hangul syllable or double syllable into its constituent Jamo.
 * First checks for double syllables (like "ㄲ", "ㅘ", etc.), then regular Hangul syllables.
 * Recursively decomposes any double syllables found in the components.
 * Returns the original character if it is not a Hangul syllable.
 * 
 * @param syllable Single character string
 * @returns Array of Jamo characters (fully decomposed, or [original] for non-Hangul)
 */
export function decomposeSyllable(syllable: string): DecomposedSyllable {
    if (!syllable || syllable.length !== 1) return [syllable];

    // First check for double syllables (fast O(1) map lookup)
    const doubleDecomp = DOUBLE_SYLLABLE_MAP[syllable];
    if (doubleDecomp) {
        return doubleDecomp;
    }

    // Fall through to regular Hangul syllable decomposition
    const code = syllable.charCodeAt(0);
    if (code < HANGUL_BASE || code > HANGUL_END) return [syllable];

    const index = code - HANGUL_BASE;
    const initial = INITIALS[Math.floor(index / SYLLABLES_PER_INITIAL)];
    const vowel = VOWELS[Math.floor((index % SYLLABLES_PER_INITIAL) / NUM_FINALS)];
    const final = FINALS[index % NUM_FINALS];

    // Recursively decompose any double syllables in the components
    const result: JamoOrOther[] = [];
    
    // Decompose initial (may be a double syllable like "ㄲ")
    const initialDecomp = decomposeSyllable(initial);
    result.push(...initialDecomp);
    
    // Decompose vowel (may be a double syllable like "ㅘ")
    const vowelDecomp = decomposeSyllable(vowel);
    result.push(...vowelDecomp);
    
    // Decompose final if it exists (may be a double syllable like "ㄳ")
    if (final) {
        const finalDecomp = decomposeSyllable(final);
        result.push(...finalDecomp);
    }
    
    return result;
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
 * Helper function to build a Hangul syllable from component indices.
 */
function buildSyllableFromIndices(
    initialIndex: number,
    vowelIndex: number,
    finalIndex: number = 0
): string {
    return String.fromCharCode(
        HANGUL_BASE +
        initialIndex * SYLLABLES_PER_INITIAL +
        vowelIndex * NUM_FINALS +
        finalIndex
    );
}

/**
 * Returns all building steps of a Hangul syllable.
 * For example, '밥' -> ['ㅂ', '바', '밥']
 * For double syllables, it breaks them down step by step:
 * '꽂' (ㄲ + ㅗ + ㄳ) -> ['ㄱ', 'ㄲ', '꼬', '꼬', '꼳', '꽂']
 * Non-Hangul characters are returned as-is.
 * 
 * @param syllable Single character string
 */
export function buildSyllableSteps(syllable: string): string[] {
    const decomposed = decomposeSyllableNonRecursive(syllable);
    
    // If it's not a Hangul syllable, return the character itself
    if (decomposed.length === 1 && decomposed[0] === syllable) {
        return [syllable];
    }

    const [initial, vowel, final] = decomposed as [Initial, Vowel, Final?];
    const steps: string[] = [];

    // Check if components are double syllables
    const initialDecomp = decomposeDoubleSyllable(initial);
    const vowelDecomp = decomposeDoubleSyllable(vowel);
    const finalDecomp = final ? decomposeDoubleSyllable(final) : null;

    // Get indices for building syllables
    const initialIndex = INITIALS.indexOf(initial);
    const vowelIndex = VOWELS.indexOf(vowel);
    const finalIndex = final ? FINALS.indexOf(final) : 0;

    // Step 1: First part of initial (if double) or full initial
    if (initialDecomp) {
        steps.push(initialDecomp[0]);
        steps.push(initial); // Full initial
    } else {
        steps.push(initial);
    }

    // Step 2: Build initial + vowel
    if (vowelDecomp) {
        // Find the index of the first part of the vowel
        const firstVowelIndex = VOWELS.indexOf(vowelDecomp[0] as Vowel);
        if (firstVowelIndex !== -1) {
            const partialVowelSyllable = buildSyllableFromIndices(
                initialIndex,
                firstVowelIndex
            );
            // Only add if it's different from what we already have
            if (steps[steps.length - 1] !== partialVowelSyllable) {
                steps.push(partialVowelSyllable);
            }
        }
        // Then full vowel
        const fullVowelSyllable = buildSyllableFromIndices(
            initialIndex,
            vowelIndex
        );
        steps.push(fullVowelSyllable);
    } else {
        // Just initial + vowel
        const initialVowel = buildSyllableFromIndices(
            initialIndex,
            vowelIndex
        );
        steps.push(initialVowel);
    }

    // Step 3: Add final if it exists
    if (final) {
        if (finalDecomp) {
            // First part of final
            const firstFinalIndex = FINALS.indexOf(finalDecomp[0] as Final);
            if (firstFinalIndex !== -1) {
                const partialFinalSyllable = buildSyllableFromIndices(
                    initialIndex,
                    vowelIndex,
                    firstFinalIndex
                );
                // Only add if it's different from the previous step
                if (steps[steps.length - 1] !== partialFinalSyllable) {
                    steps.push(partialFinalSyllable);
                }
            }
            // Then full final
            steps.push(syllable);
        } else {
            // Just add the full syllable with final
            steps.push(syllable);
        }
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

/**
 * Decomposes a double consonant or double vowel (diphthong) into its two constituent characters.
 * Returns null if the input is not a double consonant or double vowel.
 * This is a convenience wrapper around decomposeSyllable for backward compatibility.
 * 
 * @param doubleSyllable A double consonant or double vowel (e.g., "ㄲ", "ㄸ", "ㅆ", "ㄳ", "ㅘ", "ㅝ", etc.)
 * @returns A tuple of two characters [char1, char2], or null if not a double syllable
 * 
 * @example
 * decomposeDoubleSyllable("ㄲ") // returns ["ㄱ", "ㄱ"]
 * decomposeDoubleSyllable("ㄳ") // returns ["ㄱ", "ㅅ"]
 * decomposeDoubleSyllable("ㅆ") // returns ["ㅅ", "ㅅ"]
 * decomposeDoubleSyllable("ㅘ") // returns ["ㅗ", "ㅏ"]
 * decomposeDoubleSyllable("ㅝ") // returns ["ㅜ", "ㅓ"]
 * decomposeDoubleSyllable("ㅢ") // returns ["ㅡ", "ㅣ"]
 */
export function decomposeDoubleSyllable(
    doubleSyllable: string
): [string, string] | null {
    if (doubleSyllable.length !== 1) {
        return null;
    }

    // Check directly in the map for efficiency
    return DOUBLE_SYLLABLE_MAP[doubleSyllable] || null;
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
