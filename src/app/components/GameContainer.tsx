'use client';

import { redirect } from 'next/navigation';
import { useEffect, useState } from "react";
import { useSocketStore, useUserStore } from "../store/userStore";
import Game from "./Game";
import LoadingScreen from "./LoadingScreen";
import { ClientPlayerSocket, GameState, Player } from '../../shared/types';

export default function () {
    const { playerName } = useUserStore.getState();
    if (playerName.length < 1) redirect("/");

    const [userIsConnected, setUserIsConnected] = useState(false);
    const { socket } = useSocketStore.getState();

    var player: Player = { name: playerName };
    var gameState: Required<GameState> | null = null;

    function setupSocket(socket: ClientPlayerSocket) {
        socket.on("playerRegistered", (player_, gameState_) => {
            player = player_;
            gameState = gameState_;
            console.log("got player registration from server");
            setUserIsConnected(true);
        });

        socket.on("disconnect", () => {
            socket.off("playerCount");
        });
    }

    setupSocket(socket);

    useEffect(() => {
        socket.emit("registerPlayer", player);
        return () => {
            socket.disconnect();
            console.log("Socket disconnected");
        };
    }, []);

    useEffect(() => {

    }, []);

    if (userIsConnected) {
        if (gameState === null) throw new Error("unexpected error");
        return <Game gameState={gameState} player={player}></Game>
    } else {
        return <LoadingScreen
            setUserIsConnected={setUserIsConnected}
        ></LoadingScreen>
    }
}
