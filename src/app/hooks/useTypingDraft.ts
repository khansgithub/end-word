"use client";

import { useInputBoxStore } from "@/app/components/InputBox";
import type { TypingDraftPayload } from "@/shared/typingDraft";
import { useCallback, useEffect, useRef, useState } from "react";

const THROTTLE_MS = 80;
/** Avoid flicker when the typer pauses briefly between keystrokes. */
const CLEAR_DELAY_MS = 450;

function createThrottledSend(send: (text: string) => void) {
	let lastSentAt = 0;
	let pending: string | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;

	const flush = () => {
		if (pending === null) return;
		send(pending);
		lastSentAt = Date.now();
		pending = null;
	};

	return (text: string) => {
		pending = text;
		const now = Date.now();
		if (now - lastSentAt >= THROTTLE_MS) {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			flush();
			return;
		}
		if (timer) return;
		timer = setTimeout(() => {
			timer = null;
			flush();
		}, THROTTLE_MS - (now - lastSentAt));
	};
}

/**
 * React hook for managing real-time "typing draft" communication in a multiplayer game room.
 *
 * `useTypingDraft` enables sharing in-progress input (e.g., partially typed words) from one player
 * to others during their turn, and receiving live typing updates from other clients.
 * This provides spectatorship features such as "see what your opponent is typing in real-time!"
 *
 * The hook abstracts away:
 *   - Sending partial input (drafts) via the provided `sendTypingDraft` function on the active
 *     player's turn, using an internal throttling algorithm to avoid network flooding.
 *   - Receiving and displaying drafts from other players when appropriate (e.g., showing what the current
 *     turn player is typing to spectators).
 *   - Cleaning up and clearing the "other player's draft" display (using a brief debounce) when the
 *     sender stops typing or submits their turn.
 *
 * Returns:
 *   - remoteDraft: the most recent TypingDraftPayload (or null), representing the current typing
 *     of another player to be shown, or null if not applicable.
 *   - clearRemoteDraft: a function to immediately clear remote drafts (used, for example, on turn/block change).
 *   - onTypingDraft: the callback to forward incoming typing-draft broadcasts to.
 *
 * Usage:
 *   const { remoteDraft, clearRemoteDraft, onTypingDraft } = useTypingDraft(roomId, { ...options });
 *
 * See `@/shared/typingDraft` and game-v2 input components for usage details.
 */
export function useTypingDraft(
	roomId: string,
	options: {
		userId: string;
		/** True when this client is the active turn player and may type. */
		broadcastEnabled: boolean;
		/** Seat of this client when broadcasting (from gameState.thisPlayer.seat). */
		turnSeat?: number;
		/** True when this client should show others' drafts (multiplayer, playing). */
		receiveEnabled: boolean;
		/** Function to send typing drafts over the Realtime channel. */
		sendTypingDraft: (text: string, seat: number) => void;
	}
) {
	const { userId, broadcastEnabled, turnSeat, receiveEnabled, sendTypingDraft } = options;
	const [remoteDraft, setRemoteDraft] = useState<TypingDraftPayload | null>(null);
	const sendRef = useRef<(text: string) => void>(() => { });
	const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const turnSeatRef = useRef(turnSeat);
	turnSeatRef.current = turnSeat;

	const onTypingDraft = useCallback(
		(payload: TypingDraftPayload) => {
			if (!receiveEnabled) return;
			if (payload.userId === userId) return;

			if (clearTimerRef.current) {
				clearTimeout(clearTimerRef.current);
				clearTimerRef.current = null;
			}

			if (!payload.text) {
				clearTimerRef.current = setTimeout(() => {
					setRemoteDraft(null);
					clearTimerRef.current = null;
				}, CLEAR_DELAY_MS);
				return;
			}
			setRemoteDraft(payload);
		},
		[receiveEnabled, userId]
	);

	useEffect(() => {
		sendRef.current = (text: string) => {
			const seat = turnSeatRef.current;
			if (seat === undefined) return;
			sendTypingDraft(text, seat);
		};
	}, [sendTypingDraft]);

	useEffect(() => {
		if (!receiveEnabled) {
			setRemoteDraft(null);
		}
	}, [receiveEnabled]);

	const throttledSend = useRef(createThrottledSend((text) => sendRef.current(text)));
	useEffect(() => {
		throttledSend.current = createThrottledSend((text) => sendRef.current(text));
	}, []);

	useEffect(() => {
		if (!broadcastEnabled) {
			sendRef.current("");
			return;
		}

		const store = useInputBoxStore();
		let last = store.getState().inputValue;
		throttledSend.current(last);

		return store.subscribe((state) => {
			if (state.inputValue === last) return;
			last = state.inputValue;
			throttledSend.current(state.inputValue);
		});
	}, [broadcastEnabled]);

	useEffect(() => {
		return () => {
			if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
			sendRef.current("");
		};
	}, []);

	const clearRemoteDraft = useCallback(() => setRemoteDraft(null), []);

	return { remoteDraft, clearRemoteDraft, onTypingDraft };
}
