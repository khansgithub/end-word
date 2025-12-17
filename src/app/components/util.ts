import { RefObject } from "react";
import { GameState, GameStateActions, GameStateActionsBatch } from "../../shared/GameState";

export async function submitButton(refs:{inputDom: RefObject<HTMLInputElement | null>, inputDomText: RefObject<string>}, gameState: GameState, gameStateUpdate: React.Dispatch<GameStateActions | GameStateActionsBatch>) {
    if (!refs.inputDom.current) return;
    const submittedWord = refs.inputDomText.current;
    // const valid_input = await inputIsValid(submittedWord);
    const valid_input = true;
    if (valid_input && refs.inputDom.current) {
        const playerLastValue = refs.inputDomText.current;
        refs.inputDom.current.focus();
        refs.inputDom.current.value = "";
        refs.inputDomText.current = "";
        gameStateUpdate({
            type: "progressNextTurn",
            payload: {
                block: submittedWord.slice(-1),
                currentTurn: gameState.turn,
                playerLastWord: playerLastValue,
                player: gameState.players[gameState.turn]!
            }
        });
        // setMatchLetter(buildMatchLetter(submittedWord.slice(-1)));
        // players[turn].setLastWord(ihr.inputDomText.current);
        // nextTurn();
    } else {
        refs.inputDom.current?.classList.add("invalid");
    }
}

export async function inputIsValid(input: string): Promise<boolean> {
    // TODO: Add debounce to this
    if (!(input.length > 0)) return false;

    // TODO: move url to constants or something
    const res = await fetch("/dictionary/word/" + input);
    if (res.ok) {
        const data = await res.json();
        if (Object.keys(data).length == 0) {
            return false;
        }
        return true;
    } else {
        return false;
    }
}