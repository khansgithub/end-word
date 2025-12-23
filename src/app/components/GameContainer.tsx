'use client';

import { redirect } from 'next/navigation';
import { useEffect, useReducer, useRef, useState } from "react";
import { buildInitialGameState, gameStateReducer, isRequiredGameState } from '../../shared/GameState';
import { GameState, GameStateFrozen, Player } from '../../shared/types';
import { useSocketStore, useUserStore } from "../store/userStore";
import Game from "./Game";
import { handleSocket } from './socket';

export default function () {
    type connectionState = [typeof CONNECTED, typeof CONNECTING, typeof FAILED, null][number];
    const CONNECTED = 0;
    const CONNECTING = 1;
    const FAILED = 2;

    const { playerName } = useUserStore.getState();
    if (playerName.length < 1) redirect("/");

    const [userIsConnected, setUserIsConnected] = useState<connectionState>(null);
    // const [socket, tearDownHandler] = setupSocket(useSocketStore.getState().socket);
    // const [gameState, gameStateUpdate] = useReducer(gameStateReducer<GameState>, buildInitialGameState());
    // const gameStateRef = useRef<Required<GameState>>(null);
    const { state, dispatch } = useRef(
        (([s, d]) => {
            return { state: s, dispatch: d };
        })(
            useReducer(gameStateReducer<GameState>, buildInitialGameState())
        )).current;
    const { socket } = useSocketStore.getState();
    const player: Player = { name: playerName };

    // function setupSocket(socket: ClientPlayerSocket | null): [ClientPlayerSocket, (socket:ClientPlayerSocket)=>void]{
    //     if (socket===null || socket.disconnected) throw new Error("socket is disconnected or null");

    //     const event: keyof ServerToClientEvents = "playerRegistered";
    //     const handler: ServerToClientEvents[typeof event] = (gameState_) => {
    //         console.log("handler -> set gamestaet and useIsConnected");
    //         console.log(gameState_);
    //         gameState.current =  gameState_;
    //         setUserIsConnected(true);
    //     }
    //     socket.on(...[event, handler]); 
    //     return [socket, ((socket: ClientPlayerSocket) => socket.off(...[event, handler]))];
    // }
    if (socket === null || socket.disconnected) {
        throw new Error(`Socket is disconnected or has not be created yet: ${socket}`);
    }

    handleSocket(socket, state, dispatch);

    useEffect(() => {
        console.log('Register player;', player);
        
        const playerRegisterHandler = () => setUserIsConnected(CONNECTED);
        const playerRegisterFailHandlers = () => setUserIsConnected(FAILED);

        socket.once("playerRegistered", playerRegisterHandler);
        socket.once("playerNotRegistered", playerRegisterFailHandlers);

        if (userIsConnected === null){
            socket.emit("registerPlayer", player);
            setUserIsConnected(CONNECTING);
        }
        
        return () => {
            socket.off("playerRegistered", playerRegisterHandler);
            socket.off("playerNotRegistered", playerRegisterFailHandlers);
        };
    
    }, []);

    switch(userIsConnected){
        case CONNECTED:
            if (!isRequiredGameState(state)) throw new Error("gameState must be Required<> at this point");
            const frozenGameState: Required<GameStateFrozen> = {...state};
            return (
                <Game gameState={frozenGameState} dispatch={dispatch} ></Game>
            )
        case CONNECTING:
            return (
                <div className="flex w-full h-full justify-center items-center">
                    <span className="loading loading-spinner loading-xl"></span>
                </div>
            )
        case FAILED:
            return (<> failed to connect / register </>)
        default:
            throw new Error("unexpted error");
    }
}
