"use client";

import InputBox from "@/app/components/InputBox";
import InputErrorLabel from "@/app/components/game-v2/InputErrorLabel";
import SubmitButton from "@/app/components/game-v2/SubmitButton";
import { ENGLISH_MIN_WORD_LENGTH } from "@/shared/consts";
import type { MatchLetter } from "@/shared/types";
import { useCallback, useState } from "react";
import "./game-v2.css";

export interface InputSectionProps {
	matchLetter: MatchLetter;
	disabled: boolean;
	onSubmit: () => void | Promise<void>;
	language?: "en" | "ko";
	/** Inside PlayFocusPanel — no outer panel wrapper. */
	embedded?: boolean;
}

export default function InputSection({
	matchLetter,
	disabled,
	onSubmit,
	language = "ko",
	embedded = false,
}: InputSectionProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isLocked = disabled || isSubmitting;
	const opacity = isLocked ? 0.5 : 1;

	const handleSubmit = useCallback(async () => {
		if (disabled || isSubmitting) return;
		setIsSubmitting(true);
		try {
			await onSubmit();
		} finally {
			setIsSubmitting(false);
		}
	}, [disabled, isSubmitting, onSubmit]);

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
