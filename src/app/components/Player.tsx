import { BoolMap, Player, PropertyBoolMap } from "../../shared/types";

interface props {
    player: Player
    turn: boolean,
    lastWord?: string,
    isCurrentPlayer?: boolean
}

/**
 * Generic function to lookup a value from a BoolMap using boolean values.
 * Recursively navigates the map structure based on the provided boolean values.
 */
function lookupBoolMap(map: BoolMap, ...bools: boolean[]): string | boolean | number {
    // TODO: This is a hack to get the type to work.
    return bools.reduce((acc: BoolMap, bool: boolean) => {
        return acc[bool ? 1 : 0] as BoolMap;
    }, map) as unknown as string | boolean | number;
}

export default function Player ({ player, turn, lastWord, isCurrentPlayer = false }: props) {
    // Collate all isCurrentPlayer logic
    const stylesMap: Record<string, PropertyBoolMap> = {
        transform: {
            values: ['turn', 'isCurrentPlayer'],
            map: {
                1: 'scale(1.05)', // turn
                0: {
                    1: 'scale(1.02)', // isCurrentPlayer
                    0: 'scale(1)',
                },
            }
        },
        avatarBackground: {
            values: ['isCurrentPlayer'],
            map: {
                1: 'var(--gradient-avatar-active)', // isCurrentPlayer
                0: {
                    1: 'var(--gradient-avatar-default)', // isCurrentPlayer
                    0: 'var(--gradient-avatar-empty)',
                },
            }
        },
        avatarBorder: {
            values: ['isCurrentPlayer', 'turn'],
            map: {
                1: '2px solid var(--player-border-focus)', // isCurrentPlayer
                0: {
                    1: '1.5px solid var(--player-border-turn)', // turn
                    0: '1px solid var(--border-default)',
                },
            },
        },
        avatarBoxShadow: {
            values: ['isCurrentPlayer', 'turn'],
            map: {
            1: '0 3px 5px var(--player-shadow-glow), 0 0 10px var(--player-shadow-glow-subtle)', // isCurrentPlayer
            0: {
                    1: '0 0 7px var(--player-shadow-glow)', // turn
                    0: 'none',
                },
            }
        },
        nameClassName: {
            values: ['isCurrentPlayer'],
            map: {
                1: `font-semibold text-center ${isCurrentPlayer ?'font-bold': ''}`,
                0: 'text-sm font-semibold text-center',
            },
        },
        nameColor: {
            values: ['isCurrentPlayer'],
            map: {
                1: 'var(--interactive-focus)', // isCurrentPlayer
                0: 'var(--text-primary)',
            },
        },
        showYouLabel: {
            values: ['isCurrentPlayer'],
            map: {
                1: true,
                0: false,
            },
        }
    };
    

    const styles =  Object.entries(stylesMap).map(([cssProperty, propertyBoolMap]) => {
        return {
            // wip
            [cssProperty]: lookupBoolMap(propertyBoolMap.map, ...propertyBoolMap.values.map(value => value === cssProperty)),
        }
    });
    const currentPlayerStyles = {
        transform: lookupBoolMap(transformMap, turn, isCurrentPlayer),
        avatarBackground: isCurrentPlayer
            ? 'var(--gradient-avatar-active)'
            : player.uid !== undefined
                ? 'var(--gradient-avatar-default)'
                : 'var(--gradient-avatar-empty)',
        avatarBorder: isCurrentPlayer
            ? '2px solid var(--player-border-focus)'
            : turn
                ? '1.5px solid var(--player-border-turn)'
                : '1px solid var(--border-default)',
        avatarBoxShadow: isCurrentPlayer
            ? '0 3px 5px var(--player-shadow-glow), 0 0 10px var(--player-shadow-glow-subtle)'
            : turn
                ? '0 0 7px var(--player-shadow-glow)'
                : 'none',
        nameClassName: `text - sm font - semibold text - center ${ isCurrentPlayer ? 'font-bold' : '' } `,
        nameColor: isCurrentPlayer ? 'var(--interactive-focus)' : 'var(--text-primary)',
        showYouLabel: isCurrentPlayer,
    };

    return (
        <div
            className="panel w-32 transition-all duration-300 relative flex align-center flex-col"
            style={{
                backgroundColor: 'var(--bg-secondary-solid)',
                borderColor: turn
                    ? 'var(--player-border-turn)'
                    : 'var(--border-default)',
                borderWidth: turn ? '2px' : '1px',
                transform: currentPlayerStyles.transform,
            }}
        >

            <div className="flex flex-col items-center p-3">
                <div className="avatar placeholder mb-2">
                    <div
                        className="flex flex-col justify-center items-center rounded-full w-16 h-16 transition-all duration-300"
                        style={{
                            background: currentPlayerStyles.avatarBackground,
                            border: currentPlayerStyles.avatarBorder,
                            color: 'var(--text-primary)',
                            boxShadow: currentPlayerStyles.avatarBoxShadow,
                        }}
                    >
                        <span className="text-2xl font-bold">{player.name[0]?.toUpperCase() || '?'}</span>
                    </div>
                </div>

                <h3 className={currentPlayerStyles.nameClassName} style={{
                    color: currentPlayerStyles.nameColor,
                    marginTop: '0.25rem',
                }}>
                    {player.name}
                    <br />
                    {currentPlayerStyles.showYouLabel && (<span className="text-sm">(you)</span>)}

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
