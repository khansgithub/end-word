import { LookupBoolMapError } from "@/shared/errors";
import { BoolMap, GameState, PropertyBoolMap } from "@/shared/types";

// TODO: this is just overkill i think, i think i can just use tailwind classes instead ugh
export const stylesMap = {
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
            1: '0 0 0 2px var(--b-accent-muted)', // isCurrentPlayer
            0: {
                1: '0 0 0 1px var(--b-accent-muted)', // turn
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
            1: 'var(--b-accent)', // isCurrentPlayer
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
    panelClassName: {
        values: ['isCurrentPlayer'],
        map: {
            1: 'player-panel',
            0: 'panel',
        },
    },
};


/**
 * Generic function to lookup a value from a BoolMap using boolean values.
 * Recursively navigates the map structure based on the provided boolean values.
 */
export function lookupBoolMap(map: BoolMap, bools: boolean[]): string {
    let result: string | null = null;
    let temp: BoolMap | string = map;

    for (const bool of bools) {
        temp = temp[bool ? 1 : 0];
        const isMap = Object.prototype.toString.call(temp) === "[object Object]";
        if (!isMap) {
            result = temp as string;
            break;
        }
    }

    if (!result) {
        throw new LookupBoolMapError(map, bools);
    }

    return result;
}


export function buildStyles(context: any){
    let r: {[key in keyof typeof stylesMap]: string} = {
        borderColor: "",
        borderWidth: "",
        transform: "",
        avatarBackground: "",
        avatarBorder: "",
        avatarBoxShadow: "",
        nameClassName: "",
        nameColor: "",
        marginTop: "",
        panelClassName: ""
    };

    for (const property of Object.keys(stylesMap) as (keyof typeof stylesMap)[]){
        const stateFields = stylesMap[property].values;
        const boolMap = stylesMap[property].map;
        const stateValues = stateFields.map(field => context[field as keyof typeof context] as any as boolean);
        const propertyValue = lookupBoolMap(boolMap, stateValues);
        r[property] = propertyValue;
    };

    return r;

}

// buildStyles({
//     // Example mock game state, aligned with what stylesMap expects.
//     health: true,
//     isCurrentPlayer: false,
//     isDead: false,
//     hasPowerUp: true,
//     // Add other fields as necessary based on stylesMap definitions.
//     // If you wish to check real stylesMap keys, list them and ensure these booleans match the actual expected fields.
// });