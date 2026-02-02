'use client';

import { useEffect, useReducer, useRef } from "react";
import { gameStateReducer } from "../../shared/GameState";
import { emitSubmitWord, registerClientSocketHandlers as handleSocket } from "../../shared/socketClient";
import { AckSubmitWordResponseParams, GameStateClient } from "../../shared/types";
import { isPlayerTurn } from "../../shared/utils";
import InputBox, { getInputValue, resetInput, setInputError } from "./InputBox";
import Player from "./Player";
import SubmitButton from "./SubmitButton";
import { gameStrings } from "./gameStrings";
import { getSocketManager } from "./socketComponent";

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

        if (gameState.thisPlayer) {
            dispatch({
                type: "setPlayerLastWord",
                payload: [gameState, word],
            });
            console.log("[submitButton] Submitting word:", word, "by player:", gameState.thisPlayer.uid, "seat:", gameState.thisPlayer.seat);
        }

        emitSubmitWord(socket.current, word, (response: AckSubmitWordResponseParams) => {
            console.log("submitWord response", response);
            if (response.success) {
                dispatch({
                    type: "gameStateUpdateClient",
                    payload: [response.gameState],
                });
            } else {
                setInputError(true);
                console.error("submitWord failed", response.reason);
            }
        });
        resetInput();
    }

    handleSocket(socket.current, gameState, dispatch);

    useEffect(() => {
        if (gameState.thisPlayer === undefined) throw new Error("unexpted error");
    }, []);

    return (
        <div className="flex flex-col w-full min-h-screen items-center p-3 gap-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <p>{gameStrings.gameState}{JSON.stringify(gameState)}</p>
            {/* Waiting Overlay */}
            {gameState.status === 'waiting' && (
                <div className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-overlay)' }}>
                    <div className="panel" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                        <div className="flex flex-col items-center p-6">
                            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-lg" style={{ color: 'var(--text-primary)' }}>{gameStrings.waitingForGameToStart}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Round Number Badge */}
            <div className="chip px-6 py-2" style={{
                borderColor: 'var(--border-accent)',
                color: 'var(--text-secondary)',
            }}>
                {`${gameStrings.round}${gameState.turn ?? 1}`}
            </div>

            {/* Match Letter Display */}
            <div className="panel w-full max-w-2xl" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                <div className="flex flex-col items-center p-6">
                    <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{gameStrings.matchLetter}</h2>
                    <div className="text-8xl font-bold mb-4" style={{
                        color: 'var(--match-letter-color)',
                        textShadow: '1px 1px 3px var(--text-shadow-cyan)',
                    }}>
                        {gameState.matchLetter.block}
                    </div>
                </div>
            </div>

            {/* Input Section */}
            <div className="panel w-full max-w-2xl" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                <div className="flex flex-col items-center p-4">
                    <div className="flex flex-row w-full justify-center items-center gap-4">
                        <InputBox
                            matchLetter={gameState.matchLetter}
                            disabled={isDisabled}
                            onSubmit={submitButton}
                        />
                    </div>

                    <SubmitButton
                        onClick={submitButton}
                        disabled={isDisabled}
                        opacity={gameState.thisPlayer?.seat !== undefined && isPlayerTurn(gameState, gameState.thisPlayer.seat) ? 1 : 0.5}
                    />
                </div>
            </div>

            {/* Players Section */}
            <div className="panel w-full max-w-4xl" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{gameStrings.players}</h3>
                    <div className="flex flex-row flex-wrap gap-4 justify-center items-start" id="players">
                        {
                            gameState.players.map((p, i) => {
                                if (p === null) {
                                    return (
                                        <div
                                            key={i}
                                            className="panel w-32 opacity-50"
                                            style={{ backgroundColor: 'var(--bg-secondary-solid)' }}
                                        >
                                            <div className="flex flex-col items-center p-3">
                                                <div className="avatar placeholder">
                                                    <div className="flex flex-col justify-center items-center rounded-full w-16 h-16" style={{
                                                        background: 'var(--gradient-avatar-empty)',
                                                        border: '1px solid var(--border-default)',
                                                    }}>
                                                        <span className="text-2xl" style={{ color: 'var(--text-secondary)' }}>{gameStrings.emptySeat}</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{gameStrings.empty}</p>
                                            </div>
                                        </div>
                                    );
                                }
                                const isCurrentPlayer = gameState.thisPlayer?.seat === i;
                                return (
                                    <Player
                                        key={i}
                                        player={p}
                                        turn={isPlayerTurn(gameState, i)}
                                        lastWord={p.lastWord}
                                        isCurrentPlayer={isCurrentPlayer}
                                    />
                                );
                            })
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
