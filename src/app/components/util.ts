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
