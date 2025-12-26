'use client';

import { redirect } from 'next/navigation';
import { memo, useEffect, useReducer, useState } from "react";
import { buildInitialGameState, gameStateReducer } from '../../shared/GameState';
import { ClientPlayerSocket, GameState, Player } from '../../shared/types';
import { useSocketStore, useUserStore } from "../store/userStore";
import { handleSocket } from './socket';

export function unloadPage(socket: ClientPlayerSocket | null, cb?: ((...args: any[]) => void)) {
    if (socket && socket.connected) {
        socket.disconnect();
    }
    if (cb) cb();
}

function GameContainer() {
    type connectionState = [typeof CONNECTED, typeof CONNECTING, typeof FAILED, null][number];
    const [CONNECTED, CONNECTING, FAILED] = [0, 1, 2];
    const { socket } = useSocketStore.getState();
    const { playerName, clientId: playerId } = useUserStore.getState();
    if (playerName.length < 1) redirect("/");
    const [userIsConnected, setUserIsConnected] = useState<connectionState>(null);
    const playerRegisterHandler = () => {
        console.log("playerRegistered: GameContainer");
        setUserIsConnected(CONNECTED);
    };
    const playerRegisterFailHandlers = () => setUserIsConnected(FAILED);
    const [state, dispatch] = useReducer(
        gameStateReducer<GameState>,
        buildInitialGameState()
    );

    const player: Player = { name: playerName, uid: playerId };

    function loadHandlers(socket: ClientPlayerSocket) {
        socket.once("playerRegistered", playerRegisterHandler);
        socket.once("playerNotRegistered", playerRegisterFailHandlers);
    }

    function unloadHandlers(socket: ClientPlayerSocket) {
        socket.off("playerRegistered", playerRegisterHandler);
        socket.off("playerNotRegistered", playerRegisterFailHandlers);
    }


    if (socket === null || socket.disconnected) {
        unloadPage(socket);
        return;
        // redirect("/");
        // throw new Error(`Socket is disconnected or has not be created yet: ${socket}`);
    }

    handleSocket(socket, state, dispatch);

    useEffect(() => {
        // window.addEventListener('beforeunload', (() => unloadPage(socket)));
        // router.events.on('routeChangeStart', unloadPage);

        console.log("Game container: ", socket.auth);

        if (userIsConnected === null) {
            console.log('Register player;', player, socket.auth);
            loadHandlers(socket);
            socket.emit("registerPlayer", player);
            setUserIsConnected(CONNECTING);
        }

        return () => {
            unloadHandlers(socket);
        };

    }, []);
    console.count("GameContainer");
    switch (userIsConnected ?? CONNECTING) {
        case CONNECTED:
            // if (!isRequiredGameState(state)) throw new Error("gameState must be Required<> at this point");
            // const frozenGameState: Required<GameStateFrozen> = { ...state }; //FIXME: this causes the state to lose reactivity 
            
            console.log("CONNECTED", CONNECTED);
            // assertIsRequiredGameState(state);
            unloadHandlers(socket);
            return (
                <></>
                // <Game gameState={state} dispatch={dispatch} ></Game>
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
            console.error(`unexpted error: ${userIsConnected}`);
            throw new Error(`unexpted error: ${userIsConnected}`);
    }
}

export default memo(GameContainer);