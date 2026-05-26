import { lookUpWord, getRandomWordFromDictionary } from "@/app/server/dictionary/korean-api";
import { isDictionaryEntry } from "@/shared/guards";
import type { DictionaryEntry } from "@/shared/types";

export async function validateKoreanWord(
	input: string
): Promise<[true, DictionaryEntry] | false> {
	if (input.length === 0) return false;

	if (input.length > 1 && input.endsWith("다")) {
		return false;
	}

	const politeEndings = ["요", "입니다", "니까", "십시오", "읍니다", "습니다"];
	for (const ending of politeEndings) {
		if (input.endsWith(ending)) return false;
	}

	const res = await lookUpWord(input);
	return isDictionaryEntry(res) ? [true, res] : false;
}

export async function randomKoreanWord(): Promise<string> {
	return getRandomWordFromDictionary();
}
