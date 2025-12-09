'use client';

import { ChangeEvent, InputEvent, ReactEventHandler, useEffect, useRef, useState } from "react";
import Player from "./Player";
import { buildSyllableSteps, decomposeWord } from "../hangul-decomposer";
import { Player as PlayerClass } from "../classes";
import InputBox from "./InputBox";
export default function Game() {

    type MatchLetter = {
        block: string
        steps: Set<string>
        value: string
    }

    const [turn, setTurn] = useState(0);
    const [inputValue, setInputValue] = useState("");
    const [matchLetter, setMatchLetter] = useState<MatchLetter>({
        block: "",
        steps: new Set(),
        value: ""
    });

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
        const steps = new Set(decomposeWord(blocks));
        console.log(blocks, steps);
        setMatchLetter({
            block: blocks,
            steps: steps,
            value: blocks
        });
    }), []);

    useEffect((() => {
        // console.log(matchLetter)
    }), [matchLetter]);

    function inputOnChange(e: React.FormEvent<HTMLInputElement>) {
        const event = e.nativeEvent as any as InputEvent<HTMLInputElement>;
        const text = (event.target as HTMLInputElement).value.trim();
        const letter: string | null = event.data;
        var isCorrectInput = false;

        console.clear();
        console.log(`letter: ${event.data}, text: ${text}, steps: ${Array.from(matchLetter.steps)}`);

        if (text.length < matchLetter.block.length) {
            console.log("text.length < matchLetter.block.length");
            setMatchLetter(x => { return { ...x, steps: new Set(decomposeWord(matchLetter.block)) } });
        };

        if (matchLetter.steps.has(text)) {
            console.log("1: matchLetter.steps.has(text)");
            isCorrectInput = true;

            const steps = Array.from(matchLetter.steps);
            const nextLetterI = steps.indexOf(letter) + 1;
            if (nextLetterI > matchLetter.steps.size - 1) {
                console.error("last letter?");
                throw new Error("Last letter?");
            }
            const nextLetter = steps[nextLetterI];
            matchLetter.steps.delete(letter)
            console.log(matchLetter.steps);

            setMatchLetter(x => { return { ...x, value: text + nextLetter } });
        } else {
            isCorrectInput = false;
            setMatchLetter(x => x ? { ...x, value: x.block } : x)
        };

        if (text.length == 1 && !isCorrectInput && text != matchLetter.block) {
            console.log("2: text.length == 1 && text != matchLetter.block");
            // matchLetter is 가 and input is anything not 가
            updateInputValue(inputValue);
            return
        } else if (text.length == 0) {
            console.log("3: text.length == 0")
            // empty input; backspace
            updateInputValue(text);
            return
        } else if (text.length > 1 && text[0] !== matchLetter.block) {
            console.log("4: text.length > 1")
            updateInputValue(inputValue);
            return
        }

        updateInputValue(ko_pattern.test(text) ? text : inputValue);
    }

    function updateInputValue(updatedValue: string) {
        setInputValue(updatedValue);
        if (inputDom.current)
            inputDom.current.value = updatedValue;
    }

    // TODO: Add debounce to this
    async function inputIsValid(input: string): Promise<boolean> {
        if (!(input.length > 0)) return false;

        // TODO: move url to constants or something
        const res = await fetch("/dictionary/word/" + input);
        if (res.ok) {
            const data = await res.json();
            if (Object.keys(data).length == 0){
                return false;
            }
            return true;
        } else {
            return false;
        }
    }

    async function triggerButton(e: React.KeyboardEvent) {
        if (e.key != "Enter") return
        if (!(await inputIsValid(inputValue))) return
        buttonDom.current?.click();
    }

    async function buttonOnSubmit(e: React.FormEvent<HTMLButtonElement>) {
        e.preventDefault();
        const valid_input = await inputIsValid(inputValue);
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

            <div className="text-5xl">Match: <span className="text-red-500">{matchLetter.block}</span></div>

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
