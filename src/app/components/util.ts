import { RefObject } from "react";
import { socketEvents } from "../../shared/socket";
import { ClientPlayerSocket } from "../../shared/types";

export async function submitButton(
    refs: {inputDom: RefObject<HTMLInputElement | null>, inputDomText: RefObject<string>}, 
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