import { Player } from "../../shared/types";

interface props {
    player: Player
    turn: boolean,
    lastWord?: string,
    isCurrentPlayer?: boolean
}

export default function ({ player, turn, lastWord, isCurrentPlayer = false }: props) {
    return (
        <div 
            className="panel w-32 transition-all duration-300 relative" 
            style={{ 
                backgroundColor: 'var(--bg-secondary-solid)',
                borderColor: isCurrentPlayer 
                    ? 'var(--player-border-focus)' 
                    : turn 
                        ? 'var(--player-border-turn)' 
                        : 'var(--border-default)',
                borderWidth: isCurrentPlayer ? '2px' : turn ? '1.5px' : '1px',
                transform: turn ? 'scale(1.05)' : isCurrentPlayer ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isCurrentPlayer 
                    ? '0 0 0 1px var(--player-shadow-focus), 0 0 18px var(--interactive-focus-light), 0 20px 40px var(--shadow-color)' 
                    : turn 
                        ? '0 0 12px var(--player-shadow-glow), 0 20px 40px var(--shadow-color)' 
                        : 'var(--shadow-panel)',
            }}
        >
            {/* Current Player Indicator Badge */}
            {isCurrentPlayer && (
                <div 
                    className="chip absolute -top-2 -right-2 z-10"
                    style={{ 
                        background: 'var(--gradient-button)',
                        borderColor: 'var(--player-border-focus)',
                        color: 'var(--text-primary)',
                        fontWeight: 'bold',
                        padding: '0.18rem 0.45rem',
                    }}
                >
                    YOU
                </div>
            )}
            
            <div className="flex flex-col items-center p-3">
                <div className="avatar placeholder mb-2">
                    <div 
                        className="flex flex-col justify-center items-center rounded-full w-16 h-16 transition-all duration-300"
                        style={{
                            background: isCurrentPlayer 
                                ? 'var(--gradient-avatar-active)' 
                                : player.uid !== undefined 
                                    ? 'var(--gradient-avatar-default)' 
                                    : 'var(--gradient-avatar-empty)',
                            border: isCurrentPlayer 
                                ? '2px solid var(--player-border-focus)' 
                                : turn 
                                    ? '1.5px solid var(--player-border-turn)' 
                                    : '1px solid var(--border-default)',
                            color: 'var(--text-primary)',
                            boxShadow: isCurrentPlayer 
                                ? '0 0 12px var(--player-shadow-glow), 0 0 22px var(--player-shadow-glow-subtle)' 
                                : turn 
                                    ? '0 0 10px var(--player-shadow-glow)' 
                                    : 'none',
                        }}
                    >
                        <span className="text-2xl font-bold">{player.name[0]?.toUpperCase() || '?'}</span>
                    </div>
                </div>
                
                <h3 className={`text-sm font-semibold text-center ${isCurrentPlayer ? 'font-bold' : ''}`} style={{ 
                    color: isCurrentPlayer ? 'var(--interactive-focus)' : 'var(--text-primary)',
                    marginTop: '0.25rem',
                }}>
                    {player.name}
                </h3>
                
                {lastWord && (
                    <p className="text-xs text-center truncate w-full mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {lastWord}
                    </p>
                )}
                
                {turn && (
                    <div className="chip mt-1" style={{ 
                        borderColor: 'var(--player-border-chip)',
                        color: 'var(--text-success-light)',
                    }}>
                        <span className="chip-dot"></span>
                        Turn
                    </div>
                )}
            </div>
        </div>
    );
}
