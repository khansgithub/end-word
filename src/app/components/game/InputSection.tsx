"use client";

import InputBox from "@/app/components/game/InputBox";
import InputErrorLabel from "@/app/components/game/InputErrorLabel";
import SubmitButton from "@/app/components/game/SubmitButton";
import { ENGLISH_MIN_WORD_LENGTH } from "@/shared/consts";
import type { MatchLetter } from "@/shared/types";
import { useCallback } from "react";
import { ConsoleTransport, LogLayer } from 'loglayer';
import "./game-v2.css";

const L = "InputSection";
const logger = new LogLayer({
	transport: new ConsoleTransport({
		logger: console,
		enabled: process.env.NODE_ENV !== "production",
		appendObjectData: true
	})
}).withPrefix(L)

export interface InputSectionProps {
	matchLetter: MatchLetter;
	disabled: boolean;
	onSubmit: () => void | Promise<void>;
	setIsSubmitting: (isSubmitting: boolean) => void
	submitState: boolean,
	language?: "en" | "ko";
	/** Inside PlayFocusPanel — no outer panel wrapper. */
	embedded?: boolean;
}

export default function InputSection({
	matchLetter,
	disabled,
	onSubmit,
	setIsSubmitting,
	submitState,
	language = "ko",
	embedded = false,
}: InputSectionProps) {
	// const [isSubmitting] = useState(false);
	const isSubmitting = submitState;
	const isLocked = disabled || isSubmitting;
	const opacity = isLocked ? 0.5 : 1;

	const handleSubmit = useCallback(async () => {
		if (disabled || isSubmitting) {
			logger.withMetadata({ disabled, isSubmitting }).debug("handleSubmit blocked");
			return;
		}
		logger.info("handleSubmit start");
		setIsSubmitting(true);
        try {
			await onSubmit();
			logger.info("handleSubmit end");
		} finally {
			// setIsSubmitting(false);
		}
	}, [disabled, isSubmitting, onSubmit, setIsSubmitting]);

	const maxLength = language === "en" ? 20 : 7;
	const minLength = language === "en" ? ENGLISH_MIN_WORD_LENGTH : 2;

	const shellClass = embedded
		? "g2 flex flex-col gap-3 border-t pt-4"
		: "g2 g2-panel flex flex-col gap-4 p-4 md:p-5";

	return (
		<section
			className={shellClass}
			style={embedded ? { borderColor: "var(--g2-border)" } : undefined}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="g2-label">Your word</span>
				<span className="text-xs tabular-nums" style={{ color: "var(--g2-muted)" }}>
					{language === "en" ? "EN" : "KO"} · min {minLength} · max {maxLength}
				</span>
			</div>

			<div className="g2-input-legacy-host">
				<InputBox
					matchLetter={matchLetter}
					disabled={isLocked}
					pending={isSubmitting}
					onSubmit={handleSubmit}
					language={language}
				/>
			</div>
			<InputErrorLabel />

			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3">
				<SubmitButton
					onClick={handleSubmit}
					disabled={isLocked}
					pending={isSubmitting}
					opacity={opacity}
				/>
			</div>
		</section>
	);
}
