"use client";

import { GameStateClient } from "@/shared/types";
import { isPlayerTurn } from "@/shared/utils";
import { useUserStore } from "../store/userStore";
import { useState } from "react";
import { logger } from "@/lib/client/logging";

const L = "useGameState";

export function useGameState(gameState: GameStateClient) {
	const playerName = useUserStore((s) => s.playerName);

	const isSubmitting = gameState.submitting ?? false;
	const isGamePlaying = gameState.status === "playing";

	const playerCount = gameState.players.filter(
		(p) => p !== null
	).length;

	const isSoloGame = playerCount < 2;

	const isMyTurn =
		isGamePlaying &&
		gameState.thisPlayer?.seat !== undefined &&
		isPlayerTurn(gameState, gameState.thisPlayer.seat);

	const isPlayerDead =
		gameState.thisPlayer?.health < 1

	const isInputDisabled =
		!isMyTurn ||
		!isGamePlaying ||
		isPlayerDead ||
		isSubmitting;

	const isTimerPaused =
		isInputDisabled ||
		isPlayerDead ||
		isSubmitting ||
		!isGamePlaying;

	const [forceInputDisabled, setForceInputDisabled] = useState(false);

	logger.debug(L, "derived state", {
		submitting: gameState.submitting,
		isSubmitting,
		isMyTurn,
		isInputDisabled,
		isTimerPaused,
		turn: gameState.turn,
		seat: gameState.thisPlayer?.seat,
		status: gameState.status,
		health: gameState.thisPlayer?.health,
		playerCount,
	});
	
	return {
		isSubmitting,
		isGamePlaying,
		isMyTurn,
		isPlayerDead,
		isInputDisabled,
		isTimerPaused,
		isSoloGame,
        playerCount,
        forceInputDisabled,
        setForceInputDisabled,
	};
}