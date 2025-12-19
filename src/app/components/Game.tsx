'use client';

import { useEffect, useReducer, useRef } from "react";
import InputBox from "./InputBox";
import { buildInputHandlers } from "./InputFieldUtil";
import Player from "./Player";
import { GameState, Player as PlayerType } from "../../shared/types";
import { getSocketManager, websocketHandler } from "./socket";
import { submitButton } from "./util";
import { gameStateReducer } from "../../shared/GameState";

interface props {
    player: PlayerType,
    gameState: Required<GameState>
}

export default function (props: props) {
    const buttonDom = useRef<HTMLButtonElement>(null)
    const inputDom = useRef<HTMLInputElement>(null)
    const inputKeyDisplayDom = useRef<HTMLDivElement>(null)
    const inputHighlightDom = useRef<HTMLInputElement>(null)
    const inputDomText = useRef("");

    const [gameState, gameStateUpdate] = useReducer(gameStateReducer<typeof props.gameState>, props.gameState);
    const inputHandelers = buildInputHandlers({
        matchLetter: gameState.matchLetter,
        buttonDom: buttonDom,
        inputDom: inputDom,
        inputDomText: inputDomText,
        inputKeyDisplay: inputKeyDisplayDom,
        inputDomHighlight: inputHighlightDom,
    });

    const socket = useRef(getSocketManager());

    websocketHandler({
        socket: socket,
        gameState: gameState,
        gameStateUpdate: gameStateUpdate
    });

    async function buttonOnSubmit(e: React.FormEvent<HTMLButtonElement>) {
        e.preventDefault();
        await submitButton({
            inputDom: inputDom,
            inputDomText: inputDomText
        }, gameState, gameStateUpdate);
    }

    useEffect(() => {
        if (gameState.thisPlayer === undefined) throw new Error("unexpted error");
        socket.current.emit("registerPlayer", gameState.thisPlayer);
    }, []);


    return (
        <div className="flex justify-center items-center flex-col w-full min-h-fit gap-2">
            {gameState.status == 'waiting'
                ?
                <div className="flex w-full h-full justify-center items-center bg-gray-500">
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
                onClick={buttonOnSubmit || (() => { })}
                // disabled={!userIsConnected}
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
