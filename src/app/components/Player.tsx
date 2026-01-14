import { BoolMap, PropertyBoolMap } from "../../shared/types";
import type { Player as PlayerType } from "../../shared/types";

interface props {
    player: PlayerType
    turn: boolean,
    lastWord?: string,
    isCurrentPlayer?: boolean
}

/**
 * Generic function to lookup a value from a BoolMap using boolean values.
 * Recursively navigates the map structure based on the provided boolean values.
 */
function lookupBoolMap(map: BoolMap, ...bools: boolean[]): string {
    // TODO: This is a hack to get the type to work.
    return bools.reduce((acc: BoolMap, bool: boolean) => {
        return acc[bool ? 1 : 0] as BoolMap;
    }, map) as unknown as string;
}


// TODO: this is just overkill i think, i think i can just use tailwind classes instead ugh
const stylesMap = {
    // Container div styles
    borderColor: {
        values: ['turn'],
        map: {
            1: 'var(--player-border-turn)', // turn
            0: 'var(--border-default)',
        },
    },
    borderWidth: {
        values: ['turn'],
        map: {
            1: '2px', // turn
            0: '1px',
        },
    },
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
    // Avatar div styles
    avatarBackground: {
        values: ['isCurrentPlayer', 'hasPlayer'],
        map: {
            1: 'var(--gradient-avatar-active)', // isCurrentPlayer
            0: {
                1: 'var(--gradient-avatar-default)', // hasPlayer
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
            1: '0 0 12px var(--player-shadow-glow), 0 0 22px var(--player-shadow-glow-subtle)', // isCurrentPlayer
            0: {
                1: '0 0 10px var(--player-shadow-glow)', // turn
                0: 'none',
            },
        }
    },
    // Name styles
    nameClassName: {
        values: ['isCurrentPlayer'],
        map: {
            1: 'text-sm font-semibold text-center font-bold',
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
    marginTop: {
        values: ['turn'],
        map: {
            1: '-0.75rem', // turn
            0: '0',
        },
    },
} satisfies Record<string, PropertyBoolMap>;


export default function Player ({ player, turn, lastWord, isCurrentPlayer = false }: props) {
    const state = {
        turn,
        isCurrentPlayer,
    };
    console.log('Player turn:', turn);
    const styles = (Object.keys(stylesMap) as Array<keyof typeof stylesMap>).reduce(
    (acc, property) => {
        const stateFields = stylesMap[property].values;
        const boolMap = stylesMap[property].map;

        const stateValues = stateFields.map(field => state[field as keyof typeof state]);
        const propertyValue = lookupBoolMap(boolMap, ...stateValues);

        acc[property] = propertyValue;
        return acc;
    },
    {} as { [K in keyof typeof stylesMap]: string } // initial value is empty object
);
    return (
        <div
            className="panel w-32 transition-all duration-300 relative flex align-center flex-col"
            style={{
                backgroundColor: 'var(--bg-secondary-solid)',
                borderColor: styles.borderColor,
                borderWidth: styles.borderWidth,
                transform: styles.transform,
                marginTop: styles.marginTop,
            }}
        >

            <div className="flex flex-col items-center p-3">
                <div className="avatar placeholder mb-2">
                    <div
                        className="flex flex-col justify-center items-center rounded-full w-16 h-16 transition-all duration-300"
                        style={{
                            background: styles.avatarBackground,
                            border: styles.avatarBorder,
                            color: 'var(--text-primary)',
                            boxShadow: styles.avatarBoxShadow,
                        }}
                    >
                        <span className="text-2xl font-bold">{player.name[0]?.toUpperCase() || '?'}</span>
                    </div>
                </div>

                <h3 className={styles.nameClassName} style={{
                    color: styles.nameColor,
                    marginTop: '0.25rem',
                }}>
                    {player.name}
                    <br />
                    {isCurrentPlayer && (<span className="text-sm">(you)</span>)}

                </h3>

                {lastWord && (
                    <p className="text-xs text-center truncate w-full mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {lastWord}
                    </p>
                )}

                {turn && (
                    <div className="chip mt-1" style={{
                        borderColor: styles.borderColor,
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
