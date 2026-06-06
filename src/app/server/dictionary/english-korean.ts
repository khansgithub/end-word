import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEnglishWord } from "@/shared/utils";

const TRANSLATIONS_TABLE = "english_korean_definitions";
const NAVER_SEARCH_API = "https://en.dict.naver.com/api3/enko/search";
const NAVER_REFERER = "https://en.dict.naver.com/";
const NAVER_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";

function buildNaverDictionaryUrl(word: string): string {
	return `https://en.dict.naver.com/#/search?query=${encodeURIComponent(word)}&range=all`;
}

type NaverApiPayload = {
	searchResultMap?: {
		searchResultListMap?: {
			WORD?: {
				items?: Array<{
					meansCollector?: Array<{
						means?: Array<{
							value?: string;
						}>;
					}>;
				}>;
			};
		};
	};
};

function parseNaverDefinition(payload: unknown): string | null {
	const data = payload as NaverApiPayload;
	const value = data?.searchResultMap?.searchResultListMap?.WORD?.items?.[0]
		?.meansCollector?.[0]?.means?.[0]?.value;
	if (typeof value !== "string") return null;
	const withoutTags = value.replace(/<[^>]*>/g, "");
	const trimmed = withoutTags.trim();
	
	return trimmed.length ? trimmed : null;
}

async function fetchFromNaver(word: string): Promise<string | null> {
	const url = `${NAVER_SEARCH_API}?query=${encodeURIComponent(word)}`;
	const response = await fetch(url, {
		headers: {
			referer: NAVER_REFERER,
			"user-agent": NAVER_USER_AGENT,
		},
	});
	if (!response.ok) return null;
	const data = await response.json();
	return parseNaverDefinition(data);
}

async function readStoredDefinition(
	admin: SupabaseClient,
	word: string
): Promise<string | null> {
	const { data, error } = await admin
		.from(TRANSLATIONS_TABLE)
		.select("definition")
		.eq("word", word)
		.maybeSingle();
	if (error) throw error;
	return data?.definition ?? null;
}

async function saveDefinition(
	admin: SupabaseClient,
	word: string,
	definition: string
): Promise<void> {
	const { error } = await admin.from(TRANSLATIONS_TABLE).upsert(
		{
			word,
			definition,
			source: "naver",
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "word" }
	);
	if (error) throw error;
}

export type KoreanExplanationResult = {
	definition: string | null;
	linkUrl: string;
};

export async function resolveKoreanExplanation(
	admin: SupabaseClient,
	englishWord: string
): Promise<KoreanExplanationResult> {
	const normalizedWord = normalizeEnglishWord(englishWord);
	const wordForUrl = normalizedWord || englishWord;
	const linkUrl = buildNaverDictionaryUrl(wordForUrl);
	if (!normalizedWord) {
		return { definition: null, linkUrl };
	}

	try {
		const stored = await readStoredDefinition(admin, normalizedWord);
		if (stored) return { definition: stored, linkUrl };
	} catch (error) {
		console.error("[resolveKoreanExplanation] failed to read cache", error);
	}

	let fetched: string | null = null;
	try {
		fetched = await fetchFromNaver(normalizedWord);
	} catch (error) {
		console.error("[resolveKoreanExplanation] failed to fetch naver definition", error);
	}

	if (!fetched) {
		return { definition: null, linkUrl };
	}

	try {
		await saveDefinition(admin, normalizedWord, fetched);
	} catch (error) {
		console.error("[resolveKoreanExplanation] failed to persist definition", error);
	}

	return { definition: fetched, linkUrl };
}
