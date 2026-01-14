import { socketEvents } from "../../shared/socket";
import { getSocketManager } from "./socket";

/**
 * submitButtonForInputBox:
 * - Accepts: 
 *    - socket: ClientPlayerSocket
 *    - optional onError callback (for error UI, e.g. show invalid word)
 * - Grabs word from InputBox's Zustand store
 * - If empty, optionally triggers error UI; otherwise, emits to server.
 *   Does NOT manipulate DOM node refs, but fits with InputBox logic/exported hooks.
 */
import { getInputValue, resetInput, setInputError } from "./InputBox";
import { isBoolMap } from "../../shared/guards";
import { BoolMap } from "../../shared/types";

export async function submitButtonForInputBox(
    onError?: () => void
) {
    const word = getInputValue();
    if (!word || word.length === 0) {
        setInputError(true);
        if (onError) onError();
        return;
    }

    getSocketManager().emit(socketEvents.submitWord, word);
    resetInput();
}


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
