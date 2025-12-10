'use client';

import { ChangeEvent, InputEvent, ReactEventHandler, useEffect, useRef, useState } from "react";
import Player from "./Player";
import { buildSyllableSteps, decomposeWord } from "../hangul-decomposer";
import { Player as PlayerClass } from "../classes";
import InputBox from "./InputBox";
export default function Game() {

    type MatchLetter = {
        block: string
        steps: Array<string>
        value: string
        next: number
    }

    function initMatchLetter(): MatchLetter {
        const block = "가";
        const arr = buildSyllableSteps(block);
        return {
            block: block,
            steps: [...arr, block],
            value: block,
            next: 0
        };
    }

    const [refresh, setRefresh] = useState(false);
    const [turn, setTurn] = useState(0);
    // const [inputValue, setInputValue] = useState("");
    // const [matchLetter, setMatchLetter] = useState<MatchLetter>(initMatchLetter());
    const matchLetter = useRef<MatchLetter>(initMatchLetter());

    const buttonDom = useRef<HTMLButtonElement>(null);
    const inputDom = useRef<HTMLInputElement>(null);
    const inputDomText = useRef("");
    const inputKeyDisplay = useRef<HTMLDivElement>(null);
    const inputDomHighlight = useRef<HTMLInputElement>(null);
    const playerLastValue = useRef<string>("");
    const inputKey = useRef("");

    const ko_pattern = /^[가-힣ㄱ-ㅎㅏ-ㅣ]+$/;
    // const ko_pattern = /./;
    const max_players = 5;
    const players: PlayerClass[] = Array.from({ length: max_players }, (x, i) => { return new PlayerClass(`${i}`) });

    var connected_players = 5;

    useEffect(() => {
        inputDomHighlight.current.value = decomposeWord(matchLetter.current.block)[matchLetter.current.next];
    });


    // useEffect((() => {
    //     console.log("effect:", Array.from(matchLetter.steps));
    //     // if (!inputDomHighlight.current) return;
    //     // console.log("inputDomHighlight.current.value !== matchLetter.value")
    //     // console.log(inputDomHighlight.current.value, "==", matchLetter.value);

    //     // if (inputDomHighlight.current.value !== matchLetter.value){
    //     //     inputDomHighlight.current.value = matchLetter.value;         
    //     // }
    // }), [matchLetter]);

    function onBeforeInput() { }
    function onInput() { }
    function onInputKeyDown() { }
    function buttonOnSubmit() { }

    // Track whether IME is actively composing Hangul
    const isComposing = useRef(false);

    // ------------------------------------------
    // IME HANDLERS (never touch logic here)
    // ------------------------------------------
    function onCompositionStart() {
        isComposing.current = true;
    }

    function onCompositionUpdate() {
        // still composing — ignore
    }

    function onCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
        isComposing.current = false;

        const text = e.currentTarget.value.trim();
        processText(text, null); // no letter detail from IME
    }

    // ------------------------------------------
    // onChange — called AFTER each non-composition event
    // ------------------------------------------
    function onChange(e: React.ChangeEvent<HTMLInputElement>) {

        if (isComposing.current) {
            // IME in progress → DO NOT process yet
            return;
        }

        const event = e.nativeEvent as any as InputEvent;
        const letter = event.data; // can be null for delete
        const text = e.currentTarget.value.trim();

        processText(text, letter);
    }

    // ------------------------------------------------------------
    // CLEAN MAIN LOGIC (replace everything inside with your logic)
    // ------------------------------------------------------------
    function processText(text: string, letter: string | null) {

        const ml = matchLetter.current; // shorthand
        const steps = ml.steps;
        const nextIndex = ml.next;
        const nextLetter = steps[nextIndex];

        const isDelete = (letter == null);

        console.log("--------------");
        console.log("text:", text, "letter:", letter);
        console.log("matchLetter:", ml);
        console.log("--------------");

        inputKeyDisplay.current.innerText = letter ?? "";

        // --------------------------------------------------------
        // 1. First-block correctly typed → reset highlight
        // --------------------------------------------------------
        if (text[0] === ml.block) {
            inputDomHighlight.current.value = "";
            return;
        }

        // --------------------------------------------------------
        // 2. INSERTION LOGIC
        // --------------------------------------------------------
        if (!isDelete && letter) {

            // Case A — user typed the completed block directly
            if (letter === ml.block) {
                setCurrentInput(letter);
                inputDomHighlight.current.value = "";
                return;
            }

            // Case B — user typed the next Hangul step correctly
            if (letter === nextLetter) {
                ml.next++; // advance step
                setCurrentInput(letter);
                updateHighlight(ml.block, ml.next);
                return;
            }

            // Case C — user typed previous step (ㄱ → 가 → backspace → type ㄱ)
            if (text === steps[nextIndex - 1]) {
                updateHighlight(ml.block, nextIndex);
                return;
            }

            // Fallback — block incorrect input
            restorePreviousInput();
            return;
        }

        // --------------------------------------------------------
        // 3. DELETION LOGIC (backspace)
        // --------------------------------------------------------
        if (isDelete) {

            if (text.length === 0) {
                ml.next = 0;
                inputDomHighlight.current.value = steps[0];
            }
            else if (text === steps[nextIndex - 1]) {
                // valid step regression
                // (can add logic if needed)
            }

            inputDomText.current = text;
        }
    }

    // ------------------------------------------------------------
    // HELPERS — abstracts repetitive DOM behavior
    // ------------------------------------------------------------
    function setCurrentInput(letter: string) {
        inputDomText.current = letter;
        inputDom.current.value = letter;
    }

    function restorePreviousInput() {
        inputDom.current.value = inputDomText.current;
    }

    function updateHighlight(block: string, stepIndex: number) {
        const decomposed = decomposeWord(block);
        inputDomHighlight.current.value = decomposed[stepIndex - 1] + decomposed[stepIndex];
    }


    return (
        <div className="flex justify-center items-center flex-col w-full min-h-fit gap-2">

            <div className="text-5xl">Match: <span className="text-red-500">{matchLetter.current.block}</span></div>

            {/* <InputBox></InputBox> */}

            <div className="flex flex-row w-full justify-center items-center">
                <div ref={inputKeyDisplay} className="w-15 m-2 -ml-15 aspect-square text-5xl text-center border-2 border-white"> </div>
                <InputBox inputDomHighlight={inputDomHighlight} inputDom={inputDom} onBeforeInput={onBeforeInput} onInput={onInput} onInputKeyDown={onInputKeyDown} onChange={onChange} refresh={refresh} />
            </div>

            <button ref={buttonDom} onClick={buttonOnSubmit} className="p-3 mt-6 text-2xl border-2 border-amber-200 bg-gray-600"> Enter </button>
            <div className="h-10"></div>
            <div className="flex flex-row gap-2 justify-center items-center" id="players">
                {players.map((p, i) =>
                    <Player key={i} player={p} turn={i == turn} lastWord={i == turn ? playerLastValue.current : undefined}></Player>)
                }
            </div>
        </div>
    );
}
