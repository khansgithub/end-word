import type { GameStatus } from "@/shared/types";

// =============================================================================
// Status Transition Events
// =============================================================================

export type StatusTransition =
	| { type: "PLAYER_COUNT_CHANGED"; prev: number; next: number }
	| { type: "GAME_STARTED" }
	| { type: "GAME_ENDED" }
	| { type: "ROOM_DISSOLVED" };

// =============================================================================
// Central Status State Machine
// =============================================================================

export function resolveGameStatus(
	current: GameStatus,
	transition: StatusTransition
): GameStatus {
	if (current === "finished") return "finished";

	switch (transition.type) {
		case "PLAYER_COUNT_CHANGED": {
			const { prev, next } = transition;
			if (next === 0) return "waiting";
			if (next <= 1) {
				return current === "playing" ? "playing" : "waiting";
			}
			if (prev < 2 && next >= 2) {
				return "waiting";
			}
			if (current === "playing") return "playing";
			return "waiting";
		}
		case "GAME_STARTED":
			return current === "waiting" ? "playing" : current;
		case "GAME_ENDED":
			return "finished";
		case "ROOM_DISSOLVED":
			return current === "playing" ? "finished" : "waiting";
	}
}
