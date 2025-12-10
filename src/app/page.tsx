"use client";

import Image from "next/image";
import Game from "./components/Game";
import { Dispatch, memo, useRef, useState } from "react";

export default function Home() {
    const [data, setData] = useState(0);
    // foo(setData).catch( reason => {setData(`failed: ${reason}`)});
    return (
        <>
            <Game></Game>
            {/* <Foo foo={data}></Foo>
            count : {data}
            <button className="m-3 p-4 border-2 border-amber-700" onClick={e => setData(x => x+1)}> button </button> */}
        </>
    );
}

const Foo = memo(function Foo({foo}:{foo?: number}){
    const count = useRef(0);
    count.current = count.current + 1;
    return (
        <>
            <p className={"border-2 border-white"}>foo {count.current}</p>
            <Bar></Bar>
        </>
    );
});

function Bar(){
    const count = useRef(0);
    count.current = count.current + 1;

    return (
        <>
            <p className={"border-2 border-green-400"}>bar {count.current}</p>
        </>
    );
}