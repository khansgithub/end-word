import { redirect } from 'next/navigation';
import { useEffect, useRef, useState } from "react";
import { MAX_PLAYERS } from "../../shared/consts";
import { ClientPlayerSocket } from "../../shared/types";
import { useSocketStore, useUserStore } from "../store/userStore";
import { io } from 'socket.io-client';
export function Homescreen() {
    const [count, setCount] = useState(0);

    const { setName } = useUserStore.getState();

    const inputRef = useRef<HTMLInputElement>(null);

    const blockEvent = (e: React.MouseEvent | React.KeyboardEvent) => e.preventDefault();

    function onClick(event: React.MouseEvent) {
        if (!inputRef.current) return blockEvent(event);

        const inputData = inputRef.current.value;
        if (inputData.length < 1) return blockEvent(event);

        setName(inputData);

        redirect("/room");
    }

    function setupSocket(socket: ClientPlayerSocket){
        socket.on("playerCount", count => {
            console.log("got player count from server");
            setCount(count);
        });

        socket.on("disconnect", () => {
            socket.off("playerCount");
        });
    }
    
    // setupSocket(socket);

    useEffect(() => {
        console.count("Homescreen");
        inputRef.current?.focus();
        let { socket, setSocket } = useSocketStore.getState();
        if (socket === null){
            let socket = io();
            setSocket(socket);
        }
        if (socket===null) return;
        if (!socket.connected) throw new Error("socket is not connected")
        socket.emit("getPlayerCount");
        // socket.emit("text", "client to server");
        return () => {
            // socket.disconnect();
            // console.log("Socket disconnected");
        };
    }, []);

    return (
        <div className="flex flex-col w-full h-full justify-center items-center">
            <h1>Room: {count}/{MAX_PLAYERS}</h1>
            <div className="flex flex-row w-fit h-fit p-3 m-2 justify-center items-center gap-3 border-2 border-white">
                <label htmlFor="name">Name:</label>
                <input ref={inputRef} name="name" type="text" placeholder="Enter name" required={true} className="bg-gray-700 rounded-md p-2" />
            </div>
            <button className="border-2 border-amber-300 p-3 m-5" onClick={onClick}> Join </button>
        </div>
    )
}