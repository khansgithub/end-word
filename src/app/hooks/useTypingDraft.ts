"use client";

import { useRoomChannel } from "@/app/hooks/useRoomChannel";
import { useInputBoxStore } from "@/app/components/InputBox";
import type { TypingDraftPayload } from "@/shared/typingDraft";
import type { GameStateEmit } from "@/shared/types";
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

export function useTypingDraft(
	roomId: string,
	options: {
		userId: string;
		isHost: boolean;
		/** True when this client is the active turn player and may type. */
		broadcastEnabled: boolean;
		/** Seat of this client when broadcasting (from gameState.thisPlayer.seat). */
		turnSeat?: number;
		/** True when this client should show others' drafts (multiplayer, playing). */
		receiveEnabled: boolean;
		onUpdate: (emit: GameStateEmit) => void;
		onRoomClosed?: () => void;
	}
) {
	const { userId, isHost, broadcastEnabled, turnSeat, receiveEnabled, onUpdate, onRoomClosed } =
		options;
	const [remoteDraft, setRemoteDraft] = useState<TypingDraftPayload | null>(null);
	const sendRef = useRef<(text: string) => void>(() => {});
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

	const { sendTypingDraft } = useRoomChannel(roomId, {
		userId,
		isHost,
		onUpdate,
		onRoomClosed,
		onTypingDraft,
	});

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

	return { remoteDraft, clearRemoteDraft };
}
