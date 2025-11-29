'use client';

import { ChangeEvent, InputEvent, ReactEventHandler, useEffect, useRef, useState } from "react";
import Player from "./Player";
import { buildSyllableSteps, decomposeWord } from "../hangul-decomposer";
import {Player as PlayerClass} from "@/app/classes";
import InputBox from "./InputBox";
export default function Game() {

    const [turn, setTurn] = useState(0);
    const [inputValue, setInputValue] = useState("");
    const [matchLetter, setMatchLetter] = useState<{ block: string, steps: Set<string>, value: string }>({ block: "", steps: new Set(), value: "" });

    const buttonDom = useRef<HTMLButtonElement>(null);
    const inputDom = useRef<HTMLInputElement>(null);
    const inputDomHighlight = useRef<HTMLInputElement>(null);
    const playerLastValue = useRef<string>("");

    const ko_pattern = /^[가-힣ㄱ-ㅎㅏ-ㅣ]+$/;
    // const ko_pattern = /./;
    const max_players = 5;
    const players: PlayerClass[] = Array.from({ length: max_players }, (x, i) => { return new PlayerClass(`${i}`) });

    var connected_players = 5;

    useEffect((() => {
        const blocks = "가";
        const steps = new Set(buildSyllableSteps(blocks));
        console.log(blocks, steps);
        setMatchLetter({
            block: blocks,
            steps: steps,
            value: blocks
        });
    }), []);

    useEffect((() => {
        console.log(matchLetter)
    }), [matchLetter]);

    function inputOnChange(e: React.FormEvent<HTMLInputElement>) {
        const event = e.nativeEvent as any as InputEvent<HTMLInputElement>;
        const text = (event.target as HTMLInputElement).value.trim();

        console.log("text", text);

        if (matchLetter?.steps.has(text)) {
            console.log("matchLetter?.steps.has(text)");
            setMatchLetter(x => { return { ...x, value: text } });
        } else setMatchLetter(x => x ? { ...x, value: x.block } : x);

        if (text.length == 1 && text != matchLetter?.block) {
            console.log("A", text, matchLetter?.block);
            // matchLetter is 가 and input is anything not 가
            updateInputValue(inputValue);
            return
        } else if (text.length == 0) {
            console.log("B")
            // empty input; backspace
            updateInputValue(text);
            return
        }

        updateInputValue(ko_pattern.test(text) ? text : inputValue);
    }

    function updateInputValue(updatedValue: string) {
        setInputValue(updatedValue);
        if (inputDom.current)
            inputDom.current.value = updatedValue;
    }

    function inputIsValid(input: string): boolean {
        return (input.length > 0);
    }

    function triggerButton(e: React.KeyboardEvent) {
        if (e.key != "Enter") return
        if (!inputIsValid(inputValue)) return
        buttonDom.current?.click();
    }

    function buttonOnSubmit(e: React.FormEvent<HTMLButtonElement>) {
        e.preventDefault();
        const valid_input = inputIsValid(inputValue);
        if (valid_input) {
            nextTurn();
            playerLastValue.current = inputValue;
            updateInputValue("");
            inputDom.current?.focus();
            updateMatchLetter(inputValue.split("").pop()!);
        } else {
            inputDom.current?.classList.add("invalid");
        }

    }

    function updateMatchLetter(block: string) {
        const steps = new Set(buildSyllableSteps(block));
        setMatchLetter({
            block: block,
            steps: steps,
            value: block
        });
    }

    function nextTurn() {
        setTurn(t => (t + 1) % connected_players);
    }


    return (
        <div className="flex justify-center items-center flex-col w-full min-h-fit gap-2">

            <div className="text-5xl">Match: <span className="text-red-500">{matchLetter?.block}</span></div>

            {/* <InputBox></InputBox> */}
            <InputBox inputDomHighlight={inputDomHighlight} inputDom={inputDom} matchLetter={matchLetter} inputOnChange={inputOnChange} triggerButton={triggerButton}
            ></InputBox>

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
