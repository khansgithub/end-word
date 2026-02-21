import { isBoolMap } from "../../shared/guards";
import { BoolMap } from "../../shared/types";

/**
 * Lookup a value in a BoolMap by traversing with boolean keys.
 */
export function lookupBoolMap(map: BoolMap, ...bools: boolean[]): string | boolean | number {
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
