"use client";

import { useCallback, useState } from "react";
import { MatchLetter } from "@/shared/types";
import InputBox from "@/app/components/InputBox";
import SubmitButton from "@/app/components/SubmitButton";

interface InputSectionProps {
	matchLetter: MatchLetter;
	disabled: boolean;
	onSubmit: () => void | Promise<void>;
	language?: "en" | "ko";
}

export default function InputSection({ matchLetter, disabled, onSubmit, language = "ko" }: InputSectionProps) {
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

	return (
		<div className="panel md:w-full">
			<div className="flex flex-col items-center p-4">
				<div className="flex md:flex-row md:w-full justify-center items-center gap-4">
					<InputBox
						matchLetter={matchLetter}
						disabled={isLocked}
						pending={isSubmitting}
						onSubmit={handleSubmit}
						language={language}
					/>
				</div>

				<SubmitButton
					onClick={handleSubmit}
					disabled={isLocked}
					pending={isSubmitting}
					opacity={opacity}
				/>
			</div>
		</div>
	);
}
