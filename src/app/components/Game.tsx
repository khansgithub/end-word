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

const L = "Game: "
const log = console.log;
const error = console.error;

interface props {
    gameState: GameStateClient,
}

export default function Game(props: props) {
    const [gameState, dispatch] = useReducer(
        gameStateReducer<GameStateClient>,
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

        emitSubmitWord(socket.current, word, (res) => submitWordCallback(res, word));
        resetInput();
    }

    function submitWordCallback(response: AckSubmitWordResponseParams, word: string) {
        log(L, "submitWord response", response);
        if (response.success) {
            if (gameState.thisPlayer) {
                dispatch({
                    type: "setPlayerLastWord",
                    payload: [gameState, word],
                });
                log(L, "[submitButton] Submitting word:", word, "by player:", gameState.thisPlayer.uid, "seat:", gameState.thisPlayer.seat);
            }

            dispatch({
                type: "gameStateUpdateClient",
                payload: [response.gameState],
            });
        } else {
            if (gameState.thisPlayer.health == 1) {
                // TODO: show game over screen
                
            } else {
                dispatch({
                    type: "decreasePlayerHealth",
                    payload: [gameState, gameState.thisPlayer.health],
                });
                setInputError(true);
                error(L, "submitWord failed", response.reason);
            }
        }
    }

    handleSocket(socket.current, gameState, dispatch);

    useEffect(() => {
        if (gameState.thisPlayer === undefined) throw new Error("unexpted error");
    }, []);

    return (
        <div className="flex flex-col w-full min-h-screen items-center p-3 gap-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <p>gameState is: {pp(gameState)}</p>
            {/* Waiting Overlay */}
            <WaitingOverlay status={gameState.status} />

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
