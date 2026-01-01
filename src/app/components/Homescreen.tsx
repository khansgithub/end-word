import { redirect } from 'next/navigation';
import { useEffect, useRef, useState } from "react";
import { MAX_PLAYERS } from "../../shared/consts";
import { useSocketStore, useUserStore } from "../store/userStore";
import { getSocketManager } from './socket';
import { ClientPlayerSocket, Player, ServerToClientEvents } from '../../shared/types';

export function Homescreen() {
    const [playerCount, setPlayerCount] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const [returningPlayer, setReturningPlayer] = useState<Player | null>(null);
    const { clientId, setName } = useUserStore.getState();
    const inputRef = useRef<HTMLInputElement>(null);
    const blockEvent = (e: React.MouseEvent | React.KeyboardEvent) => e.preventDefault();

    const { setSocket } = useSocketStore.getState();
    let { socket } = useSocketStore.getState();

    // --- handlers -------------------------------------------------------
    const playerCountHandler = (count: number) => setPlayerCount(count);
    const returningPlayerHandler = (player: Player) => setReturningPlayer(player);
    const playerJoinNotificationHandler = () => setPlayerCount(c => c + 1);
    const playerLeaveNotificationHandler = () => setPlayerCount(c => c - 1);
    const handlers = {
        playerCount: playerCountHandler,
        returningPlayer: returningPlayerHandler,
        playerJoinNotification: playerJoinNotificationHandler,
        playerLeaveNotification: playerLeaveNotificationHandler,
    } satisfies Partial<ServerToClientEvents>;

    function socketHandlers(socket: ClientPlayerSocket, apply = true) {
        Object.keys(handlers).forEach(k => {
            const event = k as keyof typeof handlers;
            const handler = handlers[event];
            if (apply) socket.on(event, handler);
            else socket.off(event, handler);
        });
    }
    // --------------------------------------------------------------------

    function onClick(event: React.MouseEvent) {
        if (!inputRef.current) return blockEvent(event);

        const inputData = inputRef.current.value;
        if (inputData.length < 1) return blockEvent(event);
        redirectToRoom(inputData);
    }

    function onKeyDown(event: React.KeyboardEvent) {
        if (event.key !== "Enter") return;

        const playerName = inputRef.current?.value;
        if (playerName === undefined) return;

        redirectToRoom(playerName);
    }

    function redirectToRoom(playerName: string) {
        setName(playerName);
        redirect("/room");
    }

    useEffect(() => {
        console.count("Homescreen");
        inputRef.current?.focus();
        if (socket === null) {
            socket = getSocketManager(clientId); // TODO: Should the handler be already attached here?
            setSocket(socket);
        }
        socket.emit("isReturningPlayer", clientId);
        return () => { };
    }, []);

    useEffect(() => {
        if (socket === null) throw new Error("This should not happen");

        if (!socket.connected) {
            console.warn(`Could not connect to socket on retry: ${retryCount}`)
            setTimeout(() => setRetryCount(c => c + 1), 1000);
            return
        }

        socketHandlers(socket);
        // check if there exists a player with the socket.id
        socket.emit("isReturningPlayer", clientId);
        socket.emit("getPlayerCount");
        console.log(`Connected to socket after ${retryCount} attempts.`);
        return () => {
            if (!socket) return;
            socketHandlers(socket, false);
        }
    }, [retryCount]);

    useEffect(() => {
        console.log("reutrning player values -> ", returningPlayer)
        if (returningPlayer) {
            redirectToRoom(returningPlayer.name); // TODO: maybe this can be stored in zustand or smth
        }
    }, [returningPlayer]);


    // function foo() {
    //     if (!socket) return;
    //     const text = document.querySelector(".foo")?.value || "cat";
    //     socket.emit("foo", text);
    // }

    return (
        <div className="flex flex-col w-full h-full min-h-screen justify-center items-center p-3" style={{ 
            background: 'var(--bg-primary)',
        }}>
            {/* Header */}
            <header className="w-full max-w-md mb-4" style={{
                padding: '0.75rem 1.25rem',
                background: 'var(--gradient-header)',
                borderBottom: '1px solid #1f2937',
                borderRadius: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
            }}>
                <div>
                    <h1 style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        letterSpacing: '0.03em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-primary)',
                    }}>
                        <span style={{
                            width: '0.9rem',
                            height: '0.9rem',
                            borderRadius: '999px',
                            background: 'conic-gradient(from 180deg, #38bdf8, #a855f7, #22c55e, #38bdf8)',
                            boxShadow: '0 0 14px rgba(56, 189, 248, 0.9)',
                        }}></span>
                        End Word
                    </h1>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Join a game room
                    </div>
                </div>
            </header>

            <div className="panel w-full max-w-md" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                <div className="flex flex-col items-center text-center p-6">
                    <div className="stats stats-horizontal mb-4 w-full" style={{ 
                        background: 'var(--gradient-chip)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '0.55rem',
                    }}>
                        <div className="stat place-items-center py-2">
                            <div className="stat-title text-xs" style={{ color: 'var(--text-secondary)' }}>Players</div>
                            <div className="stat-value text-2xl" style={{ color: 'var(--text-primary)' }}>
                                {playerCount}/{MAX_PLAYERS}
                            </div>
                        </div>
                    </div>

                    <div className="form-control w-full mb-4">
                        <label className="label" htmlFor="name">
                            <span className="label-text text-base" style={{ color: 'var(--text-primary)' }}>Your Name</span>
                        </label>
                        <input 
                            ref={inputRef} 
                            id="name"
                            name="name" 
                            type="text" 
                            placeholder="Enter your name" 
                            required={true} 
                            onKeyDown={onKeyDown} 
                            className="w-full text-base py-3 rounded-[0.55rem] border border-[var(--input-border-default)] font-mono outline-none transition-all duration-200 ease-in-out px-[0.75rem] placeholder:text-[#4b5563] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_1px_rgba(8,47,73,0.9),0_0_18px_var(--interactive-focus-light)]" 
                            style={{ 
                                background: 'var(--input-bg-solid)',
                                boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.95)',
                                color: 'var(--text-primary)',
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(15, 23, 42, 0.95)';
                            }}
                        />
                    </div>
                    
                    <button 
                        className="btn-fsm px-6 py-3 text-base" 
                        onClick={onClick}
                    > 
                        <span>▶</span>
                        Join Game
                    </button>
                </div>
            </div>
        </div>
    )
}
