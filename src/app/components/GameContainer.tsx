'use client';

import { redirect } from 'next/navigation';
import { RefObject, useEffect, useRef, useState } from "react";
import { useSocketStore, useUserStore } from "../store/userStore";
import Game from "./Game";
import LoadingScreen from "./LoadingScreen";
import { ClientPlayerSocket, GameState, Player, ServerToClientEvents } from '../../shared/types';

export default function () {
    const { playerName } = useUserStore.getState();
    if (playerName.length < 1) redirect("/");

    const [userIsConnected, setUserIsConnected] = useState(false);
    const [socket, tearDownHandler] = setupSocket(useSocketStore.getState().socket);
    
    var player: Player = { name: playerName };
    var gameState = useRef<Required<GameState>>(null);

    function setupSocket(socket: ClientPlayerSocket | null): [ClientPlayerSocket, (socket:ClientPlayerSocket)=>void]{
        if (socket===null || socket.disconnected) throw new Error("socket is disconnected or null");

        const event: keyof ServerToClientEvents = "playerRegistered";
        const handler: ServerToClientEvents[typeof event] = (gameState_) => {
            console.log("handler -> set gamestaet and useIsConnected");
            console.log(gameState_);
            gameState.current =  gameState_;
            setUserIsConnected(true);
        }
        socket.on(...[event, handler]); 
        return [socket, ((socket: ClientPlayerSocket) => socket.off(...[event, handler]))];
    }

    useEffect(() => {
        console.log('socket.emit("registerPlayer", player);', player);
        socket.emit("registerPlayer", player);
        return () => {
            tearDownHandler(socket);
            // socket.disconnect();
            // console.log("Socket disconnected");
        };
    }, []);

    // useEffect(() => {

    // }, []);

    if (userIsConnected) {
        if (gameState.current === null) throw new Error("unexpected error");
        return <Game gameState={gameState.current} player={player}></Game>
    } else {
        // return <LoadingScreen setUserIsConnected={setUserIsConnected} ></LoadingScreen>
        return (
            <div className="flex w-full h-full justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
            </div>
        )
    }
}
