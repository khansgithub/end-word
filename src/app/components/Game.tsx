'use client';

import { useReducer, useRef } from "react";
import { gameStateReducer, initialGameState } from "./GameState";
import InputBox from "./InputBox";
import { inputHandlers } from "./InputFieldUtil";
import Player from "./Player";
import { getSocketManager, websocketHanlder, websocketHanlderRefs } from "./socket";


export default function Game({playerName, playerI} : {playerName: string, playerI: number}) {
    console.count("Game");
    const [gameState, gameStateUpdate] = useReducer(gameStateReducer, initialGameState(playerName, playerI));

    // Reference to the submit button
    const buttonDom = useRef<HTMLButtonElement>(null);

    const inputHandlersRefs = {
        matchLetter: gameState.matchLetter, //TODO: do i need to pass gameStateUpdate here?
        buttonDom: buttonDom,
        stopTrackingInput: useRef(false),

        // Reference to the user's input element (the actual visible input box)
        inputDom: useRef<HTMLInputElement>(null),

        // The last *validated* input text your logic accepted.
        // This is the canonical value used by submit and restore logic.
        inputDomText: useRef(""),

        // Displays the most recently typed key
        inputKeyDisplay: useRef<HTMLDivElement>(null),

        // Overlay input used to visually show the "next required Hangul step"
        // For example highlighting a jamo in progress.
        inputDomHighlight: useRef<HTMLInputElement>(null),

        // Track whether IME is actively composing Hangul
        isComposing: useRef(false),
    };

    const ihr = inputHandlersRefs;
    const { onChange, onCompositionUpdate, onCompositionEnd, onKeyDown, onBeforeInput } = inputHandlers(inputHandlersRefs);

    const socketHandlersRefs: websocketHanlderRefs = {
        socket: useRef(getSocketManager()),
        gameState: gameState,
        gameStateUpdate: gameStateUpdate
        // players: players, // TODO: i'm not sure if this needs to be a ref; unsure about how an array if affected by re-renders
    };

    websocketHanlder(socketHandlersRefs);

    // useEffect(() => {
    //     ihr.inputDomHighlight.current.value = matchLetter?.steps[0] || "";
    //     console.log("update");
    // }, [matchLetter]);


    async function inputIsValid(input: string): Promise<boolean> {
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

    async function buttonOnSubmit(e: React.FormEvent<HTMLButtonElement>) {
        e.preventDefault();
        const submittedWord = ihr.inputDomText.current;
        // const valid_input = await inputIsValid(submittedWord);
        const valid_input = true;
        if (valid_input) {
            const playerLastValue = ihr.inputDomText.current;
            ihr.inputDom.current?.focus();
            ihr.inputDom.current.value = "";
            ihr.inputDomText.current = "";
            gameStateUpdate({
                type: "progressNextTurn",
                payload: {
                    block: submittedWord.slice(-1),
                    currentTurn: gameState.turn,
                    playerLastWord: playerLastValue,
                    player: gameState.players[gameState.turn] // FIXME: typing isn't working well - is this is a null, no error is raised
                }
            });
            // setMatchLetter(buildMatchLetter(submittedWord.slice(-1)));
            // players[turn].setLastWord(ihr.inputDomText.current);
            // nextTurn();
        } else {
            ihr.inputDom.current?.classList.add("invalid");
        }
    }

    return (
        <div className="flex justify-center items-center flex-col w-full min-h-fit gap-2">
            <div className="text-5xl">Match: <span className="text-red-500">{gameState.matchLetter.block}</span></div>
            {/* <Foo onChange={barfoo}></Foo> */}
            {/* <InputBox></InputBox> */}

            <div className="flex flex-row w-full justify-center items-center">
                <div ref={ihr.inputKeyDisplay} className="w-15 m-2 -ml-15 flex justify-center place-items-center aspect-square text-4xl overflow-hidden border-2 border-white"> </div>
                <InputBox
                    inputDomHighlight={ihr.inputDomHighlight}
                    inputDom={ihr.inputDom}
                    onChange={onChange}
                    onCompositionStart={() => { }}
                    onCompositionUpdate={onCompositionUpdate}
                    onCompositionEnd={onCompositionEnd}
                    onBeforeInput={onBeforeInput}
                    onKeyDown={onKeyDown}
                />
            </div>

            <button
                ref={ihr.buttonDom}
                onClick={buttonOnSubmit}
                className="p-3 mt-6 text-2xl border-2 border-amber-200 bg-gray-600"> Enter </button>
            <div className="h-10"></div>
            <div className="flex flex-row gap-2 justify-center items-center" id="players">
                {
                    gameState.players
                        .filter(p => p !== null)
                        .map((p, i) =>
                            <Player key={i} player={p} turn={i == gameState.turn} lastWord={p.lastWord}></Player>
                        )
                }
            </div>
        </div>
    );
}
