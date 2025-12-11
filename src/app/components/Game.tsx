'use client';

import { ChangeEvent, InputEvent, ReactEventHandler, useEffect, useRef, useState } from "react";
import Player from "./Player";
import { buildSyllableSteps, decomposeWord } from "../hangul-decomposer";
import { Player as PlayerClass } from "../classes";
import InputBox from "./InputBox";
import { initMatchLetter, inputHandlers, MatchLetter } from "./InputFieldUtil";
export default function Game() {
    // Current turn number in the game (increments after successful submit)
    const [turn, setTurn] = useState(0);

    const inputHandlersRefs = {
        // Tracks the expected Hangul block + its decomposition steps + current step index
        // Example:
        //   block: "각"
        //   steps: ["ㄱ", "가", "각"]
        //   next: 1 (next step the user must type)
        matchLetter: useRef<MatchLetter>(initMatchLetter()),

        // Reference to the submit button
        buttonDom: useRef<HTMLButtonElement>(null),

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

        stopTrackingInput: useRef(false),

        // Stores the last successfully submitted word
        playerLastValue: useRef<string>(""),

        // Track whether IME is actively composing Hangul
        isComposing: useRef(false),
    };

    const ihr = inputHandlersRefs;

    const max_players = 5;

    const players: PlayerClass[] = Array.from({ length: max_players }, (x, i) => { return new PlayerClass(`${i}`) });

    var connected_players = 5;

    const { onChange, onCompositionUpdate, onCompositionEnd } = inputHandlers(inputHandlersRefs);

    function onCompositionStart(){
        console.log("on composition start");
    }

    function nextTurn() {
        setTurn(t => (t + 1) % connected_players);
    }

    useEffect(() => {
        ihr.inputDomHighlight.current.value = decomposeWord(ihr.matchLetter.current.block)[ihr.matchLetter.current.next];
    });

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
        const valid_input = await inputIsValid(ihr.inputDomText.current);
        if (valid_input) {
            nextTurn();
            ihr.playerLastValue.current = ihr.inputDomText.current;
            ihr.inputDom.current?.focus();
        } else {
            ihr.inputDom.current?.classList.add("invalid");
        }
    }

    return (
        <div className="flex justify-center items-center flex-col w-full min-h-fit gap-2">

            <div className="text-5xl">Match: <span className="text-red-500">{ihr.matchLetter.current.block}</span></div>

            {/* <InputBox></InputBox> */}

            <div className="flex flex-row w-full justify-center items-center">
                <div ref={ihr.inputKeyDisplay} className="w-15 m-2 -ml-15 aspect-square text-5xl text-center border-2 border-white"> </div>
                <InputBox
                    inputDomHighlight={ihr.inputDomHighlight}
                    inputDom={ihr.inputDom}
                    onChange={onChange}
                    onCompositionStart={onCompositionStart}
                    onCompositionUpdate={onCompositionUpdate}
                    onCompositionEnd={onCompositionEnd}
                />
            </div>

            <button
                ref={ihr.buttonDom}
                onClick={buttonOnSubmit}
                className="p-3 mt-6 text-2xl border-2 border-amber-200 bg-gray-600"> Enter </button>
            <div className="h-10"></div>
            <div className="flex flex-row gap-2 justify-center items-center" id="players">
                {players.map((p, i) =>
                    <Player key={i} player={p} turn={i == turn} lastWord={i == turn ? ihr.playerLastValue.current : undefined}></Player>)
                }
            </div>
        </div>
    );
}
