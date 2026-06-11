import type { DictionaryEntry } from "@/shared/types";

/** Realtime broadcast event: validated word definition for the room word-history panel. */
export const WORD_DEFINITION_EVENT = "wordDefinition" as const;

export type WordDefinitionPayload = DictionaryEntry;

export function appendDefinitionToHistory(
	current: DictionaryEntry[],
	definition: DictionaryEntry
): DictionaryEntry[] {
	const deduped = new Map(current.map((entry) => [entry.key, entry]));
	deduped.set(definition.key, definition);
	return Array.from(deduped.values());
}
