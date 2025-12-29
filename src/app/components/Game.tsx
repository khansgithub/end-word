'use client';

import { useEffect, useReducer, useRef } from "react";
import { gameStateReducer } from "../../shared/GameState";
import { GameState, GameStateFrozen } from "../../shared/types";
import { pp } from "../../shared/utils";
import InputBox from "./InputBox";
import { buildInputHandlers } from "./InputFieldUtil";
import Player from "./Player";
import { getSocketManager, handleSocket } from "./socket";
import { submitButton } from "./util";

interface props {
    gameState: Required<GameStateFrozen>,
    // dispatch: ActionDispatch<[action: GameStateActionsType]>,
}

export default function Game(props: props) {
    const [gameState, dispatch] = useReducer(
        gameStateReducer<GameState>,
        props.gameState
    );
    const buttonDom = useRef<HTMLButtonElement>(null)
    const inputDom = useRef<HTMLInputElement>(null)
    const inputKeyDisplayDom = useRef<HTMLDivElement>(null)
    const inputHighlightDom = useRef<HTMLInputElement>(null)
    const inputDomText = useRef("");

    const inputHandelers = buildInputHandlers({
        matchLetter: gameState.matchLetter,
        buttonDom: buttonDom,
        inputDom: inputDom,
        inputDomText: inputDomText,
        inputKeyDisplay: inputKeyDisplayDom,
        inputDomHighlight: inputHighlightDom,
    });

    const socket = useRef(getSocketManager());

    async function buttonOnSubmit(e: React.FormEvent<HTMLButtonElement>) {
        e.preventDefault();
        await submitButton({
            inputDom: inputDom,
            inputDomText: inputDomText
        }, gameState, dispatch);
    }

    handleSocket(socket.current, gameState, dispatch);
    console.log(`
            Game Component
            gameState: ${pp(gameState)}
            clientId: ${pp(socket.current.auth)}
        `);

    useEffect(() => {
        if (gameState.thisPlayer === undefined) throw new Error("unexpted error");
    }, []);


    return (
        <div className="flex justify-center items-center flex-col w-full min-h-fit gap-2">
            <p>{gameState.status}</p>
            {gameState.status == 'waiting'
                ?
                <div className="flex w-full h-full justify-center absolute items-center bg-black opacity-80">
                    <span className="loading loading-spinner loading-xl"></span>
                </div>
                : <></>
            }
            <div className="text-5xl">Match: <span className="text-red-500">{gameState.matchLetter.block}</span></div>
            {/* <Foo onChange={barfoo}></Foo> */}
            {/* <InputBox></InputBox> */}

            <div className="flex flex-row w-full justify-center items-center">
                <div ref={inputKeyDisplayDom} className="w-15 m-2 -ml-15 flex justify-center place-items-center aspect-square text-4xl overflow-hidden border-2 border-white"> </div>
                <InputBox
                    inputDomHighlight={inputHighlightDom}
                    inputDom={inputDom}
                    onChange={inputHandelers.onChange}
                    onCompositionStart={() => { }}
                    onCompositionUpdate={inputHandelers.onCompositionUpdate}
                    onCompositionEnd={inputHandelers.onCompositionEnd}
                    onBeforeInput={inputHandelers.onBeforeInput}
                    onKeyDown={inputHandelers.onKeyDown}
                    disabled={false}//{!userIsConnected}
                />
            </div>

            <button
                ref={buttonDom}
                onClick={buttonOnSubmit}
                // disabled={!userIsConnected}
                className="p-3 mt-6 text-2xl border-2 border-amber-200 bg-gray-600"> Enter </button>
            <div className="h-10"></div>
            <div className="flex flex-row gap-2 justify-center items-center" id="players">
                {
                    gameState.players
                        // .filter(p => p !== null)
                        .map((p, i) => {
                            console.log(`rendering players: ${i}`);
                            if (p === null) return <div key={i}> empty </div>
                            else return <Player key={i} player={p} turn={i == gameState.thisPlayer?.seat} lastWord={p.lastWord}></Player>
                        })
                }
            </div>
        </div>
    );
}
