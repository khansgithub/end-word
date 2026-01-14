import { BoolMap, PropertyBoolMap } from "../shared/types";
import { pp } from "../shared/utils";

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
    showYouLabel: {
        values: ['isCurrentPlayer'],
        map: {
            1: true,
            0: false,
        },
    }
} as const satisfies Record<string, PropertyBoolMap>;

function isBoolMap(value: any): value is BoolMap {
    // TODO: ugly hack lol
    return typeof value === 'object';
}

function lookupBoolMap(map: BoolMap, ...bools: boolean[]): string | boolean | number {
    let value: string | boolean | number | null = null;
    let traverser: BoolMap = map;
    for (const bool of bools) {
        let temp = traverser[bool ? 1 : 0];
        if (isBoolMap(temp)) traverser = temp;
        else value = temp;
    }
    if (value === null) throw new Error('Value is null');
    return value;
}

const state = {
    isCurrentPlayer: true,
    turn: true,
}


const styles = (Object.keys(stylesMap) as Array<keyof typeof stylesMap>).reduce(
    (acc, property) => {
        console.log(`----------------- calculating "${property}" -----------------`);
        const stateFields = stylesMap[property].values;
        const boolMap = stylesMap[property].map;

        const stateValues = stateFields.map(field => state[field as keyof typeof state]);
        console.log(`Calculating property "${property}":`);
        console.log(`  stateFields:`, stateFields);
        console.log(`  stateValues:`, stateValues);
        console.log(`  boolMap:`, boolMap);

        const propertyValue = lookupBoolMap(boolMap, ...stateValues);

        console.log(`  propertyValue:`, propertyValue);

        acc[property] = propertyValue;
        console.log(`----------------- done -----------------`);
        return acc;
    },
    {} as Record<keyof typeof stylesMap, string | boolean | number> // initial value is empty object
);

console.log(pp(styles));