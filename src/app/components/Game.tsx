'use client';

import { useEffect, useReducer, useRef } from "react";
import { gameStateReducer } from "../../shared/GameState";
import { emitSubmitWord, registerClientSocketHandlers as handleSocket } from "../../shared/socketClient";
import { AckSubmitWordResponseParams, GameStateClient } from "../../shared/types";
import { isPlayerTurn, pp } from "../../shared/utils";
import { getInputValue, resetInput, setInputError } from "./InputBox";
import HealthDisplay from "./HealthDisplay";
import InputSection from "./InputSection";
import MatchLetterDisplay from "./MatchLetterDisplay";
import PlayersSection from "./PlayersSection";
import { RoundNumberBadge } from "./RoundNumberBadge";
import { getSocketManager } from "./socketComponent";
import WaitingOverlay from "./WaitingOverlay";
import GameOverlay from "./GameOverlay";
import { correctWord, submitWordCallback, wrongWord } from "./wordSubmit";

const L = `${__filename}: `
const log = console.log;
const error = console.error;

interface props {
    gameState: GameStateClient,
}

export default function Game(props: props) {
    const [gameState, dispatch] = useReducer(
        gameStateReducer,
        props.gameState
    );

    const isDisabled = gameState.thisPlayer?.seat === undefined || !isPlayerTurn(gameState, gameState.thisPlayer.seat);

    const socket = useRef(getSocketManager());

    async function submitButton(e?: React.FormEvent<HTMLButtonElement>) {
        if (e) e.preventDefault();

        const word = getInputValue();
        if (!word || word.length === 0) {
            setInputError(true);
            return;
        }
        log(L, "[submitButton] Submitting word:", word, "by player:", gameState.thisPlayer.uid, "seat:", gameState.thisPlayer.seat);
        emitSubmitWord(
            socket.current,
            word,
            (response) => submitWordCallback(
                gameState,
                dispatch,
                setInputError,
                response,
                word,
            )
        );
        resetInput();
    }

    handleSocket(socket.current, gameState, dispatch);

    useEffect(() => {
        if (gameState.thisPlayer === undefined) throw new Error("unexpted error");
    }, []);

    return (
        <div className="flex flex-col w-full min-h-screen items-center p-3 gap-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <p>gameState is: {JSON.stringify(gameState)}</p>
            {/* Waiting Overlay */}
            {/* <WaitingOverlay status={gameState.status} /> */}
            <GameOverlay status={gameState.status} players={gameState.players} />

            {/* Round Number Badge */}
            <RoundNumberBadge turn={gameState.turn ?? 1} />

            {/* Match Letter Display */}
            <MatchLetterDisplay matchLetter={gameState.matchLetter} />

            {/* Health Display */}
            <HealthDisplay health={gameState.thisPlayer.health} />

            {/* Input Section */}
            <InputSection
                matchLetter={gameState.matchLetter}
                disabled={isDisabled}
                onSubmit={submitButton}
            />

            {/* Players Section */}
            <PlayersSection gameState={gameState} />
        </div>
    );
}
