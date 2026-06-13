"use client";

import { useEffect, useState } from "react";
import { useInputBoxStore } from "@/app/components/game/InputBox";
import { gameStrings } from "@/lib/client/ui/game-strings";

/** Surfaces InputBox zustand error state with game-v2 styling. */
export default function InputErrorLabel() {
	const useInputStore = useInputBoxStore();
	const isError = useInputStore((s) => s.isError);
	const errorMessage = useInputStore((s) => s.errorMessage);
	const errorShakeTick = useInputStore((s) => s.errorShakeTick);
	const [isShaking, setIsShaking] = useState(false);

	useEffect(() => {
		if (errorShakeTick === 0) return;
		setIsShaking(true);
		const timer = window.setTimeout(() => setIsShaking(false), 450);
		return () => window.clearTimeout(timer);
	}, [errorShakeTick]);

	if (!isError) return null;

	return (
		<p
			className={`text-xs mt-1 ${isShaking ? "g2-shake" : ""}`}
			style={{ color: "var(--g2-danger)" }}
			role="alert"
		>
			{errorMessage ?? gameStrings.inputInvalidText}
		</p>
	);
}
