import { normalizeEnglishWord } from "@/shared/utils";
import type { GameLanguage, GameState } from "@/shared/types";

export function normalizeSubmittedWord(word: string, language: GameLanguage): string {
	if (language === "en") return normalizeEnglishWord(word);
	return word.trim();
}

export function isWordAlreadyUsed(state: GameState, word: string): boolean {
	const language = state.language ?? "ko";
	const normalized = normalizeSubmittedWord(word, language);
	return (state.usedWords ?? []).includes(normalized);
}

export function addUsedWord(state: GameState, word: string): GameState {
	const language = state.language ?? "ko";
	const normalized = normalizeSubmittedWord(word, language);
	const used = state.usedWords ?? [];
	if (used.includes(normalized)) return state;
	return { ...state, usedWords: [...used, normalized] };
}
