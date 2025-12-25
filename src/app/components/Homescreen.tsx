import { redirect } from 'next/navigation';
import { useEffect, useRef, useState } from "react";
import { MAX_PLAYERS } from "../../shared/consts";
import { useSocketStore, useUserStore } from "../store/userStore";
import { getSocketManager } from './socket';
import { Player } from '../../shared/types';

export function Homescreen() {
    const [count, setCount] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const [returningPlayer, setReturningPlayer] = useState<Player | null>(null);
    const { playerId, setName } = useUserStore.getState();

    const inputRef = useRef<HTMLInputElement>(null);

    const blockEvent = (e: React.MouseEvent | React.KeyboardEvent) => e.preventDefault();

    // --- handlers -------------------------------------------------------
    const playerCountHandler = (count: number) => setCount(count);
    const returningPlayerHandler = (player: Player) => setReturningPlayer(player);
    // --------------------------------------------------------------------

    function onClick(event: React.MouseEvent) {
        if (!inputRef.current) return blockEvent(event);

        const inputData = inputRef.current.value;
        if (inputData.length < 1) return blockEvent(event);
        redirectToRoom(inputData);
    }

    function onKeyDown(event: React.KeyboardEvent){
        if (event.key !== "Enter") return;
        
        const playerName = inputRef.current?.value;
        if (playerName === undefined) return;

        redirectToRoom(playerName);
    }

    function redirectToRoom(playerName: string){
        setName(playerName);
        redirect("/room");
    }

    useEffect(() => {
        console.count("Homescreen");
        inputRef.current?.focus();
        const { setSocket } = useSocketStore.getState();
        let { socket } = useSocketStore.getState();
        if (socket === null) {
            socket = getSocketManager(playerId); // TODO: Should the handler be already attached here?
            setSocket(socket);
        }
        socket.emit("isReturningPlayer")
        return () => {};
    }, []);

    useEffect(() => {
        let { socket } = useSocketStore.getState();

        if (socket === null) throw new Error("This should not happen");

        if (!socket.connected) {
            console.warn(`Could not connect to socket on retry: ${retryCount}`)
            setTimeout(() => setRetryCount(c => c + 1), 1000);
        } else {
            // check if there exists a player with the socket.id
            socket.on("playerCount", playerCountHandler);
            socket.emit("getPlayerCount");
            console.log(`Connected to socket after ${retryCount} attempts.`);
        };

        return () =>{
            socket.off("playerCount", playerCountHandler);
        }
    }, [retryCount]);

    useEffect( () => {

    }, []);

    return (
        <div className="flex flex-col w-full h-full min-h-fit justify-center items-center">
            <h1>Room: {count}/{MAX_PLAYERS}</h1>
            <div className="flex flex-row w-fit h-fit p-3 m-2 justify-center items-center gap-3 border-2 border-white">
                <label htmlFor="name">Name:</label>
                <input ref={inputRef} name="name" type="text" placeholder="Enter name" required={true} onKeyDown={onKeyDown} className="bg-gray-700 rounded-md p-2" />
            </div>
            <button className="border-2 border-amber-300 p-3 m-5" onClick={onClick}> Join </button>
        </div>
    )
}