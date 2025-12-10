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
        const arr = decomposeWord(block);
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

    // useEffect((() => {
    //     console.log("effect:", Array.from(matchLetter.steps));
    //     // if (!inputDomHighlight.current) return;
    //     // console.log("inputDomHighlight.current.value !== matchLetter.value")
    //     // console.log(inputDomHighlight.current.value, "==", matchLetter.value);

    //     // if (inputDomHighlight.current.value !== matchLetter.value){
    //     //     inputDomHighlight.current.value = matchLetter.value;         
    //     // }
    // }), [matchLetter]);

    function inputTextHandler(text?: string, letter?: string, del = false): { block: boolean } {
        /*
            this function needs a way to tell the event handler that the that the value input should blocked.
        */
        const preventDefault = { block: true };
        const nextLetter = matchLetter.current.steps[matchLetter.current.next];

        // console.clear();
        console.log("-------------");
        console.log(`letter: ${letter}, text: ${text}, nextLetter: ${nextLetter}`);
        console.log(`matchLetter: ${JSON.stringify(matchLetter)}`);
        console.log("-------------");


        // if (letter) {
        //     if (letter == nextLetter || letter == matchLetter.current.block) {
        //         console.log("letter == nextLetter");
        //         console.log(letter, "==", nextLetter);
        //         matchLetter.current.next++;
        //     } else {
        //         return preventDefault;
        //     }
        // }

        return { block: false }
    }

    function onBeforeInput(e: React.FormEvent<HTMLInputElement>) {
        // console.log("onBeforeInput");
        // const event = e.nativeEvent as any as InputEvent<HTMLInputElement>;
        // const text = (event.target as HTMLInputElement).value.trim();
        // const letter: string | null = event.data;

        // if (inputTextHandler(text, letter).block){
        //     e.preventDefault();
        // }

    }

    function onInput(e: React.FormEvent<HTMLInputElement>) {
        // const key = (e.nativeEvent as any as InputEvent).data;
        // if (key !== null) return
        // // backspace or delete
        // console.log("onInput - delete");
        // const event = e.nativeEvent as any as InputEvent<HTMLInputElement>;
        // const text = (event.target as HTMLInputElement).value.trim();
        // const letter: string | null = event.data;
        // inputTextHandler(text, letter, true);
    }

    function onInputKeyDown(){}
    function buttonOnSubmit(){}

    function onChange(e: React.FormEvent<HTMLInputElement>) {
        console.log("onChange");
        const event = e.nativeEvent as any as InputEvent<HTMLInputElement>;
        const text = (event.target as HTMLInputElement).value.trim();
        const letter: string | null = event.data;
        const del = letter == null;
        const nextLetter = matchLetter.current.steps[matchLetter.current.next];
        // inputDom.current.value = "";

        console.clear();
        console.log("-------------");
        console.log(`letter: ${letter}, text: ${text}, nextLetter: ${nextLetter}`);
        console.log(`matchLetter: ${JSON.stringify(matchLetter)}`);
        console.log("-------------");

        inputKeyDisplay.current.innerText = letter;

        // conditios for when the first block is correctly typed
        if (text[0] == matchLetter.current.block){
            // the first block has be correctly typed?
            return;
        }

        if (letter) {
            if (letter == nextLetter) {
                console.log("letter == nextLetter");
                console.log(letter, "==", nextLetter);
                matchLetter.current.next++;
                inputDomText.current = text;
            } else if (letter == matchLetter.current.block) {

            } else {
                console.log("block input");
                inputDom.current.value = inputDomText.current;
            }
        }

        if (del){
            if (text == null){
                matchLetter.current.next = 0;
            } else {
                // forgot why but chnge from decomposeSyllable to buildSyllableSteps
            }
            inputDomText.current = text;
        }
    }

    /*
        Use beforeInput to process the key press and validate it.

        Use onInput where if data == null => text being deleted

    */


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
