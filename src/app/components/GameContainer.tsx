'use client';

import { redirect } from 'next/navigation';
import { useEffect, useRef, useState } from "react";
import { buildInitialGameState } from '../../shared/GameState';
import { assertIsRequiredGameState } from '../../shared/guards';
import { ClientPlayerSocket, GameState, Player, PlayerWithId } from '../../shared/types';
import { useSocketStore, useUserStore } from "../store/userStore";
import Game from './Game';
import { makeNewPlayer } from '../../shared/utils';

const L = "Game Container: "
const log = console.log;


export function unloadPage(socket: ClientPlayerSocket | null, cb?: ((...args: any[]) => void)) {
    if (socket && socket.connected) {
        socket.disconnect();
    }
    if (cb) cb();
}

function GameContainer() {
    // connection constants and type
    const [CONNECTED, CONNECTING, FAILED] = [0, 1, 2] as const;
    type ConnectionState = typeof CONNECTED | typeof CONNECTING | typeof FAILED | null;

    // external state from stores
    const { playerName, clientId: playerId } = useUserStore.getState();
    if (!playerName) redirect("/");
    const { socket } = useSocketStore.getState();

    // React state
    const [userIsConnected, setUserIsConnected] = useState<ConnectionState>(null);
    const state = useRef(buildInitialGameState());
    // const [state, dispatch] = useReducer(
    //     gameStateReducer<GameState>,
    //     buildInitialGameState()
    // );

    // derived data
    const player: PlayerWithId = makeNewPlayer(playerName, playerId);

    // handlers
    const playerRegisterHandler = (state_: GameState) => {
        log(L, "playerRegisteredHandler");
        state.current = state_;
        setUserIsConnected(CONNECTED);
    };
    const playerRegisterFailHandlers = () => setUserIsConnected(FAILED);

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
        console.warn(`Socket is disconnected or has not be created yet: ${socket}`);
        return;
        // redirect("/");
        // throw new Error(`Socket is disconnected or has not be created yet: ${socket}`);
    }

    // handleSocket(socket, state, dispatch);

    useEffect(() => {
        // window.addEventListener('beforeunload', (() => unloadPage(socket)));
        // router.events.on('routeChangeStart', unloadPage);

        log(L, `useEffect():
            clientId: ${socket.auth}
            useIsConencted: ${userIsConnected}
        `);

        if (userIsConnected === null) {
            console.count("EMIT: REGISTER PLAYER");
            log(L, 'Register player;', player, socket.auth);
            loadHandlers(socket);
            socket.emit("registerPlayer", player);
            setUserIsConnected(CONNECTING);
        }

        return () => {
            unloadHandlers(socket);
        };

    }, []);
    
    console.count("GameContainer");
    
    const StatusPanel = ({ children, hasError = false }: { children: React.ReactNode; hasError?: boolean }) => (
        <div className="flex w-full h-screen justify-center items-center p-4" style={{ backgroundColor: 'transparent' }}>
            <div className="panel max-w-md" style={{ 
                backgroundColor: 'var(--bg-secondary-solid)',
                ...(hasError && { borderColor: 'var(--border-error)' }),
            }}>
                {children}
            </div>
        </div>
    );
    
    switch (userIsConnected ?? CONNECTING) {
        case CONNECTED:
            log(L, "CONNECTED", CONNECTED);
            assertIsRequiredGameState(state.current);
            // unloadHandlers(socket);
            // log(L, pp(state));
            return (
                // <></>
                <Game gameState={state.current}></Game>
            )
        case CONNECTING:
            return (
                <StatusPanel>
                    <div className="flex flex-col items-center p-6">
                        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-lg" style={{ color: 'var(--text-primary)' }}>Connecting to game...</p>
                    </div>
                </StatusPanel>
            )
        case FAILED:
            return (
                <StatusPanel hasError>
                    <div className="flex flex-col items-start p-6 gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full" style={{ 
                                background: 'var(--text-error-dark)',
                                boxShadow: '0 0 8px var(--error-glow)',
                            }}></div>
                            <h3 className="font-semibold text-lg" style={{ color: 'var(--text-error)' }}>Connection Failed</h3>
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed to connect or register. Please try again.</div>
                    </div>
                </StatusPanel>
            )
        default:
            console.error(`unexpted error: ${userIsConnected}`);
            throw new Error(`unexpted error: ${userIsConnected}`);
    }
}

export default GameContainer;
