"use client";

import Image from "next/image";
import Game from "./components/Game";
import { Dispatch, memo, RefObject, useEffect, useRef, useState } from "react";
import { foobar } from "./util";
import { Homescreen } from "./components/Homescreen";

export default function() {
    const [data, setData] = useState(null);
    // const foobar2 = foobar(data);
    const onChange = foobar(data);

    useEffect(() => {
        const block = "abc";
        setData({
            block: block,
            steps: block.split(""),
            value: block,
            next: 0
        });
    }, []);

    function onClick() {
        // e => setData(x => x+1)
        const block = data.block;
        setData({
            block: block.split("").reverse().join(""),
            steps: block.split("").reverse(),
            value: block,
            next: 0
        });
    }

    return (
        // <Game></Game>
        <Homescreen></Homescreen>
        // <div className="w-3/12 h-full flex flex-col justify-center items-center">
        //     {/* <Foo onChange={onChange}></Foo> */}
        //     {/* count : {JSON.stringify(data)} */}
        //     {/* <button className="m-3 p-4 border-2 border-amber-700" onClick={onClick}> button </button> */}
        //     {/* <button className="m-3 p-4 border-2 border-amber-700" onClick={foo.onClick}> button2 </button> */}
        //     {/* <p>{foobar2()}</p> */}
        // </div>
    );
}


const Foo = memo(function ({onChange}) {
    return (
        <input className="border-2 border-white" onChange={onChange}/>
    )
});