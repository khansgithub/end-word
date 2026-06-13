"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import "./game-v2.css";

export interface GameExitProps {
	onExit?: () => void;
	className?: string;
	disabled?: boolean;
}

/** Leave / exit control with confirm step. */
export default function GameExit({ onExit, className = "", disabled = false }: GameExitProps) {
	const router = useRouter();
	const [confirming, setConfirming] = useState(false);

	const handleExit = useCallback(() => {
		if (onExit) {
			onExit();
			return;
		}
		router.push("/lobby");
	}, [onExit, router]);

	if (confirming) {
		return (
			<div
				className={`g2 flex items-center gap-2 rounded-full border px-2 py-1 ${className}`}
				style={{ borderColor: "var(--g2-border)", background: "var(--g2-surface-raised)" }}
				role="group"
				aria-label="Confirm exit"
			>
				<span className="text-xs px-1" style={{ color: "var(--g2-muted)" }}>
					Leave game?
				</span>
				<button
					type="button"
					className="g2-focus-ring text-xs font-semibold px-2 py-1 rounded-full"
					style={{ color: "var(--g2-danger)" }}
					disabled={disabled}
					onClick={() => {
						setConfirming(false);
						handleExit();
					}}
				>
					Yes
				</button>
				<button
					type="button"
					className="g2-focus-ring text-xs font-medium px-2 py-1 rounded-full"
					style={{ color: "var(--g2-muted)" }}
					disabled={disabled}
					onClick={() => setConfirming(false)}
				>
					No
				</button>
			</div>
		);
	}

	return (
		<button
			type="button"
			className={`g2 g2-focus-ring text-sm font-medium px-3 py-1.5 rounded-full border transition-colors hover:opacity-90 ${className}`}
			style={{
				borderColor: "var(--g2-border)",
				color: "var(--g2-muted)",
				background: "transparent",
			}}
			disabled={disabled}
			onClick={() => setConfirming(true)}
		>
			Exit
		</button>
	);
}
