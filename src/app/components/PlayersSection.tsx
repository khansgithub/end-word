import { GameStateClient } from "../../shared/types";
import { isPlayerTurn } from "../../shared/utils";
import { gameStrings } from "./gameStrings";
import Player from "./Player";

interface PlayersSectionProps {
    gameState: GameStateClient;
}

export default function PlayersSection({ gameState }: PlayersSectionProps) {
    return (
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
    );
}
