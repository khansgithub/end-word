"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { gameStateReducer, gameStateUpdateClient } from "@/shared/GameState";
import { ThisPlayerUndefinedError } from "@/shared/errors";
import type { GameStateClient } from "@/shared/types";
import { isPlayerTurn } from "@/shared/utils";
import { submitWordApi } from "@/app/lib/roomApi";
import { submitWordCallback } from "@/app/lib/wordSubmit";
import Definitions from "./Definitions";
import GameOverlay from "./GameOverlay";
import HealthDisplay from "./HealthDisplay";
import { getInputValue, resetInput, setInputError } from "./InputBox";
import InputSection from "./InputSection";
import MatchLetterDisplay from "./MatchLetterDisplay";
import PlayersSection from "./PlayersSection";
import { RoundNumberBadge } from "./RoundNumberBadge";
import type { DictionaryEntry } from "@/shared/types";
import { useRoomRealtime } from "@/app/hooks/useRoomRealtime";

interface GameProps {
  roomId: string;
  gameState: GameStateClient;
  onStateChange: (state: GameStateClient) => void;
  language?: "en" | "ko";
}

export default function Game({ roomId, gameState: initialState, onStateChange, language = "ko" }: GameProps) {
  const [gameState, dispatch] = useReducer(gameStateReducer, initialState);
  const [lastDefinition, setLastDefinition] = useState<DictionaryEntry | null>(null);

  const syncParent = useCallback(
    (next: GameStateClient) => {
      onStateChange(next);
    },
    [onStateChange]
  );

  const applyRemote = useCallback(
    (emit: Parameters<typeof gameStateUpdateClient>[0]) => {
      dispatch({
        type: "gameStateUpdateClient",
        payload: [emit],
      });
    },
    []
  );

  useRoomRealtime(roomId, applyRemote);

  useEffect(() => {
    syncParent(gameState);
  }, [gameState, syncParent]);

  useEffect(() => {
    if (gameState.thisPlayer === undefined) {
      throw new ThisPlayerUndefinedError("", gameState);
    }
  }, [gameState]);

  const isDisabled =
    gameState.thisPlayer?.seat === undefined ||
    !isPlayerTurn(gameState, gameState.thisPlayer.seat) ||
    gameState.status !== "playing";

  async function submitButton(e?: React.FormEvent<HTMLButtonElement>) {
    if (gameState.status === "finished") return;
    if (e) e.preventDefault();

    const word = getInputValue();
    if (!word || word.length === 0) {
      setInputError(true);
      return;
    }

    const response = await submitWordApi(roomId, word);
    if (response.success && response.definition) {
      setLastDefinition(response.definition);
    }
    submitWordCallback(gameState, dispatch, setInputError, response, word);
    resetInput();
  }

  return (
    <div
      className="flex flex-col w-dvw min-h-screen items-center"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="flex flex-col md:max-w-4xl items-center justify-center p-3 gap-3">
        <GameOverlay status={gameState.status} players={gameState.players} />
        <RoundNumberBadge turn={gameState.turn ?? 1} />
        <MatchLetterDisplay matchLetter={gameState.matchLetter} />
        <HealthDisplay health={gameState.thisPlayer.health} />
        <div className="relative flex flex-col md:flex-row gap-1">
          <div className="md:w-8/12 shrink-0">
            <InputSection
              matchLetter={gameState.matchLetter}
              disabled={isDisabled}
              onSubmit={submitButton}
              language={language}
            />
          </div>
          <div className="md:w-4/12 shrink-0" aria-hidden />
          <div className="md:absolute md:right-0 md:top-0 md:bottom-0 w-full md:w-4/12">
            <Definitions definition={lastDefinition} />
          </div>
        </div>
        <PlayersSection gameState={gameState} />
      </div>
    </div>
  );
}
