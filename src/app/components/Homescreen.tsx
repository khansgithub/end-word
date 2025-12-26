import { redirect } from 'next/navigation';
import { useEffect, useRef, useState } from "react";
import { MAX_PLAYERS } from "../../shared/consts";
import { useSocketStore, useUserStore } from "../store/userStore";
import { getSocketManager } from './socket';
import { ClientPlayerSocket, Player, ServerToClientEvents } from '../../shared/types';

export function Homescreen() {
    const [count, setCount] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const [returningPlayer, setReturningPlayer] = useState<Player | null>(null);
    const { clientId, setName } = useUserStore.getState();
    const inputRef = useRef<HTMLInputElement>(null);
    const blockEvent = (e: React.MouseEvent | React.KeyboardEvent) => e.preventDefault();

    const { setSocket } = useSocketStore.getState();
    let { socket } = useSocketStore.getState();

    // --- handlers -------------------------------------------------------
    const playerCountHandler = (count: number) => setCount(count);
    const returningPlayerHandler = (player: Player) => setReturningPlayer(player);
    const handlers = {
        playerCount: playerCountHandler,
        returningPlayer: returningPlayerHandler
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


    function foo(){
        if(!socket) return;
        const text = document.querySelector(".foo")?.value || "cat";
        socket.emit("foo", text);
    }

    return (
        <div className="flex flex-col w-full h-full min-h-fit justify-center items-center">
            <h1>Room: {count}/{MAX_PLAYERS}</h1>
            <div className="flex flex-row w-fit h-fit p-3 m-2 justify-center items-center gap-3 border-2 border-white">
                <label htmlFor="name">Name:</label>
                <input ref={inputRef} name="name" type="text" placeholder="Enter name" required={true} onKeyDown={onKeyDown} className="bg-gray-700 rounded-md p-2" />
            </div>
            <button className="border-2 border-amber-300 p-3 m-5" onClick={onClick}> Join </button>

            <button className="btn btn-wide" onClick={foo}>F O O</button>
            <input className='input foo' placeholder='asd'></input>
        </div>
    )
}
