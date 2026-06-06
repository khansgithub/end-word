/** Ephemeral in-progress word from the player whose turn it is (realtime broadcast). */
export type TypingDraftPayload = {
	userId: string;
	/** Seat index of the typer (uids are stripped from client player list). */
	seat: number;
	text: string;
};

export const TYPING_DRAFT_EVENT = "typingDraft" as const;
