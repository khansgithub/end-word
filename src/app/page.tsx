"use client";

import Image from "next/image";
import Game from "./components/Game";
import { Dispatch, memo, RefObject, useEffect, useRef, useState } from "react";
import { foobar } from "./util";
import { Homescreen } from "./components/Homescreen";

export default function () {
    const [data, setData] = useState(0);
    // const foobar2 = foobar(data);
    // const onChange = foobar(data);

    function onClick() {
        setData((v) => v + 1);
    }

    return (
        // <Game></Game>
        <Homescreen></Homescreen>
        // <div className="w-3/12 h-full flex flex-col justify-center items-center">
        //     {/* <button onClick={onClick} className="border-2 border-white p-3 m-3 "> click: {data} </button> */}
        //     {/* <Foo state={data}></Foo> */}
        //     {/* <Foo onChange={onChange}></Foo> */}
        //     {/* count : {JSON.stringify(data)} */}
        //     {/* <button className="m-3 p-4 border-2 border-amber-700" onClick={onClick}> button </button> */}
        //     {/* <button className="m-3 p-4 border-2 border-amber-700" onClick={foo.onClick}> button2 </button> */}
        //     {/* <p>{foobar2()}</p> */}
        // </div>
    );
}


const Foo = memo(function (props: { state: number}) {
    // const [count, setCount] = useState(0);
    const count = useRef(0);
    useEffect(() => {
        count.current += 1;
    }, []);
    return (
        // <input className="border-2 border-white" onChange={onChange}/>
        <div className="border-2 p-4 m-2" style={{ borderColor: 'var(--border-success)' }}>
            <h4>foo</h4>
            <p>times rendered: {count.current}</p>
            <input name="foo"></input>
            <p>data: {props.state}</p>
        </div>
    )
}, ((prev, next) => {
    return false;
}));