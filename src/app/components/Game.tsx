'use client';

import { useEffect, useReducer, useRef } from "react";
import { gameStateReducer } from "../../shared/GameState";
import { ThisPlayerUndefinedError } from "../../shared/errors";
import { emitSubmitWord, registerClientSocketHandlers as handleSocket } from "../../shared/socketClient";
import { GameStateClient } from "../../shared/types";
import { isPlayerTurn } from "../../shared/utils";
import { getSocketManager } from "../lib/socket";
import { submitWordCallback } from "../lib/wordSubmit";
import Definitions from "./Definitions";
import GameOverlay from "./GameOverlay";
import HealthDisplay from "./HealthDisplay";
import { getInputValue, resetInput, setInputError } from "./InputBox";
import InputSection from "./InputSection";
import MatchLetterDisplay from "./MatchLetterDisplay";
import PlayersSection from "./PlayersSection";
import { RoundNumberBadge } from "./RoundNumberBadge";
import { redirect } from "next/navigation";

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
        if (gameState.status === "finished") return;
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
        if (gameState.thisPlayer === undefined) throw new ThisPlayerUndefinedError("", gameState);
    }, []);

    if (gameState.connectedPlayers === 0) redirect("/");

    return (
        <div className="flex flex-col w-dvw min-h-screen items-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex flex-col md:max-w-4xl items-center justify-center p-3 gap-3">
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

                {/* Input Section  w-8/12 shrink-0*/}
                <div className="relative flex flex-col md:flex-row gap-1">
                    <div className="md:w-8/12 shrink-0"> 
                        <InputSection
                            matchLetter={gameState.matchLetter}
                            disabled={isDisabled}
                            onSubmit={submitButton}
                        />
                    </div>
                    <div className="md:w-4/12 shrink-0" aria-hidden />
                    <div className="md:absolute md:right-0 md:top-0 md:bottom-0 w-full md:w-4/12">
                        <Definitions />
                    </div>
                </div>

                {/* Players Section */}
                <PlayersSection gameState={gameState} />
            </div>
        </div>
    );
}
