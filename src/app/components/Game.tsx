
'use client';

import { useEffect, useReducer, useRef } from "react";
import { gameStateReducer } from "../../shared/GameState";
import { GameState, GameStateFrozen } from "../../shared/types";
import { isPlayerTurn } from "../../shared/utils";
import InputBox from "./InputBox";
import Player from "./Player";
import { getSocketManager, handleSocket } from "./socket";
import { submitButtonForInputBox as submitButton } from "./util";

interface props {
    gameState: Required<GameStateFrozen>,
}

export default function Game(props: props) {
    const [gameState, dispatch] = useReducer(
        gameStateReducer<GameState>,
        props.gameState
    );
    const isDisabled = gameState.thisPlayer?.seat === undefined || !isPlayerTurn(gameState.turn, gameState.connectedPlayers, gameState.thisPlayer.seat);
    const buttonDom = useRef<HTMLButtonElement>(null)
    const inputDom = useRef<HTMLInputElement>(null)
    const inputDomText = useRef("");

    const socket = useRef(getSocketManager());

    async function buttonOnSubmit(e: React.FormEvent<HTMLButtonElement>) {
        e.preventDefault();
        await submitButton();
        // await submitButton({
        //     inputDom: inputDom,
        //     inputDomText: inputDomText
        // }, socket.current);
    }

    handleSocket(socket.current, gameState, dispatch);
    // console.log(`
    //         Game Component
    //         gameState: ${pp(gameState)}
    //         clientId: ${pp(socket.current.auth)}
    //     `);

    useEffect(() => {
        if (gameState.thisPlayer === undefined) throw new Error("unexpted error");
    }, []);

    return (
        <div className="flex flex-col w-full min-h-screen items-center p-3 gap-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* Waiting Overlay */}
            {gameState.status === 'waiting' && (
                <div className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-overlay)' }}>
                    <div className="panel" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                        <div className="flex flex-col items-center p-6">
                            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-lg" style={{ color: 'var(--text-primary)' }}>Waiting for game to start...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Round Number Badge */}
            <div className="chip px-6 py-2" style={{
                borderColor: 'var(--border-accent)',
                color: 'var(--text-secondary)',
            }}>
                {`Round ${gameState.turn ?? 1}`}
            </div>

            {/* Match Letter Display */}
            <div className="panel w-full max-w-2xl" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                <div className="flex flex-col items-center p-6">
                    <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Match Letter</h2>
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
                                    onSubmit={() => submitButton()}
                                />
                    </div>

                    <button
                        ref={buttonDom}
                        onClick={buttonOnSubmit}
                        disabled={isDisabled}
                        className="btn-fsm mt-4 px-6 py-3 text-base"
                        style={{
                            opacity: gameState.thisPlayer?.seat !== undefined && isPlayerTurn(gameState.turn, gameState.connectedPlayers, gameState.thisPlayer.seat) ? 1 : 0.5,
                        }}
                    >
                        <span>▶ Submit Word</span>
                        
                    </button>
                </div>
            </div>

            {/* Players Section */}
            <div className="panel w-full max-w-4xl" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Players</h3>
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
                                                        <span className="text-2xl" style={{ color: 'var(--text-secondary)' }}>?</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>Empty</p>
                                            </div>
                                        </div>
                                    );
                                }
                                const isCurrentPlayer = gameState.thisPlayer?.seat === i;
                                return (
                                    <Player
                                        key={i}
                                        player={p}
                                        turn={isPlayerTurn(gameState.turn, gameState.connectedPlayers, i)}
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
