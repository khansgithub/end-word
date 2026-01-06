import { RefObject } from "react";
import { socketEvents } from "../../shared/socket";
import { ClientPlayerSocket } from "../../shared/types";

export async function submitButton(
    refs: {
        inputDom: RefObject<HTMLInputElement | null>,
        inputDomText: RefObject<string>
    }, 
    socket: ClientPlayerSocket
) {
    if (!refs.inputDom.current) return;
    const submittedWord = refs.inputDomText.current;
    
    // Validate word is not empty
    if (submittedWord.length === 0) {
        refs.inputDom.current?.classList.add("invalid");
        return
    }

    // Send word submission to server (server is source of truth)
    socket.emit(socketEvents.submitWord, submittedWord);
}

/**
 * submitButtonForInputBox2:
 * - Accepts: 
 *    - socket: ClientPlayerSocket
 *    - optional onError callback (for error UI, e.g. show invalid word)
 * - Grabs word from InputBox2's Zustand store
 * - If empty, optionally triggers error UI; otherwise, emits to server.
 *   Does NOT manipulate DOM node refs, but fits with InputBox2 logic/exported hooks.
 */
import { getInputValue, setInputError, resetInput } from "./InputBox";
import { getSocketManager } from "./socket";

export async function submitButtonForInputBox2(
    socket: ClientPlayerSocket,
    onError?: () => void
) {
    const submittedWord = getInputValue();
    if (!submittedWord || submittedWord.length === 0) {
        setInputError(true);
        if (onError) onError();
        return;
    }

    // Send word submission to server (server is source of truth)
    socket.emit(socketEvents.submitWord, submittedWord);

    // Optionally reset input after submission – up to calling code
    // resetInput();
}

export function submitButton2(word: string){
    const socket = getSocketManager();
    socket.emit(socketEvents.submitWord, word);
}
