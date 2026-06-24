"use client";

import { GameStateClient } from "@/shared/types";
import { isPlayerTurn } from "@/shared/utils";
import { useUserStore } from "../store/userStore";
import { useState } from "react";
import { ConsoleTransport, LogLayer } from 'loglayer';

const L = "useGameState";
const logger = new LogLayer({
	transport: new ConsoleTransport({
		logger: console,
		enabled: process.env.NODE_ENV !== "production",
		appendObjectData: true
	})
}).withPrefix(L)

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

	// logger.withMetadata({
	// 	submitting: gameState.submitting,
	// 	isSubmitting,
	// 	isMyTurn,
	// 	isInputDisabled,
	// 	isTimerPaused,
	// 	turn: gameState.turn,
	// 	seat: gameState.thisPlayer?.seat,
	// 	status: gameState.status,
	// 	health: gameState.thisPlayer?.health,
	// 	playerCount,
	// }).debug("derived state");

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