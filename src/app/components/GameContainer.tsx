'use client';

import { redirect } from 'next/navigation';
import { useEffect, useRef, useState } from "react";
import { buildInitialGameState } from '../../shared/GameState';
import { assertIsGameStateClient, assertIsRequiredGameState } from '../../shared/guards';
import { AckRegisterPlayerResponse, ClientPlayerSocket, GameState, GameStateClient, PlayerWithId } from '../../shared/types';
import { makeNewPlayer } from '../../shared/utils';
import { useSocketStore, useUserStore } from "../store/userStore";
import Game from './Game';
import { socketEvents } from '../../shared/socket';
import { socketRegisterPlayer } from './socket';

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
    const [userIsConnected, setUserIsConnected] = useState<ConnectionState>(CONNECTING);
    const state = useRef<GameStateClient>(null);

    // derived data
    const player: PlayerWithId = makeNewPlayer(playerName, playerId);

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

        if (userIsConnected !== CONNECTED) {
            console.count("EMIT: REGISTER PLAYER");
            log(L, 'Register player;', player, socket.auth);
        }

        socketRegisterPlayer(socket, player, (response: AckRegisterPlayerResponse) => {
            if (response.success) {
                const nextState: GameStateClient = {
                    ...response.gameState,
                    thisPlayer: response.player
                }
                state.current = nextState;
                setUserIsConnected(CONNECTED);
            } else {
                setUserIsConnected(FAILED);
            }
        });
        return () => { };

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
            assertIsGameStateClient(state.current!);
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
