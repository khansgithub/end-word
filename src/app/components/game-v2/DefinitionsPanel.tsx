"use client";

import { useEffect, useRef, useState } from "react";
import type { DictionaryEntry } from "@/shared/types";
import "./game-v2.css";

export interface DefinitionsPanelProps {
	/** Latest definition from a successful submit. */
	definition: DictionaryEntry | null;
}

/**
 * Scrollable list of correct words + brief definitions.
 * WIRE: `definition={lastDefinition}` from Game state (set on successful submit).
 * WIRE: accumulation logic — copy from `@/app/components/Definitions`.
 */
export default function DefinitionsPanel({ definition }: DefinitionsPanelProps) {
	const definitions = useRef(new Map<string, DictionaryEntry>());
	const [, setDefCount] = useState(0);

	useEffect(() => {
		if (!definition) return;
		definitions.current.set(definition.key, definition);
		setDefCount((c) => c + 1);
	}, [definition]);

	const entries = Array.from(definitions.current).reverse();

	return (
		<section
			className="g2 g2-panel flex flex-col overflow-hidden max-h-[min(32vh,14rem)] sm:max-h-[min(36vh,16rem)]"
			aria-label="Word definitions"
		>
			<header className="shrink-0 px-4 pt-4 pb-2 border-b" style={{ borderColor: "var(--g2-border)" }}>
				<h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
					Words played
				</h2>
				<p className="text-xs mt-0.5" style={{ color: "var(--g2-muted)" }}>
					Correct submissions in this game
				</p>
			</header>

			<ul className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 space-y-1">
				{entries.length === 0 ? (
					<li className="px-3 py-8 text-center text-sm" style={{ color: "var(--g2-muted)" }}>
						No words yet
					</li>
				) : (
					entries.map(([word, entry], index) => (
						<li
							key={word}
							className="rounded-(--g2-radius) px-3 py-2.5 transition-colors"
							style={{
								background:
									index === 0
										? "var(--g2-accent-muted)"
										: "transparent",
							}}
						>
							<p className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
								{word}
							</p>
							<p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--g2-muted)" }}>
								{/* {entry.data[0]?.definition ?? ""} */}
								{entry.data.at(0)?.definition ?? ""}
							</p>
						</li>
					))
				)}
			</ul>
		</section>
	);
}
