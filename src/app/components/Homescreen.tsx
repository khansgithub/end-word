import { MAX_PLAYERS } from "../../shared/consts";
import { io } from "socket.io-client";
import { ClientPlayerSocket } from "../../shared/types";
import { useEffect, useRef, useState } from "react";

export function Homescreen() {
    const [count, setCount] = useState(0);
    const socketRef = useRef(io() as ClientPlayerSocket);

    useEffect(() => {
        socketRef.current.emit("getPlayerCount");
        socketRef.current.on("playerCount", count => {
            console.log("got player count from server");
            setCount(count);
        });
    }, []);

    return (
        <div className="flex flex-col w-full h-full justify-center items-center">
            <h1>Room: {count}/{MAX_PLAYERS}</h1>
            <div className="flex flex-row w-fit h-fit p-3 m-2 justify-center items-center gap-3 border-2 border-white">
                <label htmlFor="name">Name:</label>
                <input name="name" type="text" placeholder="Enter name" className="bg-gray-700 rounded-md p-2" />
            </div>
            <button className="border-2 border-amber-300 p-3 m-5"> Join </button>
        </div>
    )
}