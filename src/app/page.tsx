"use client";

import Image from "next/image";
import Game from "./components/Game";
import { Dispatch, useState } from "react";

export default function Home() {
    const [data, setData] = useState(null);
    // foo(setData).catch( reason => {setData(`failed: ${reason}`)});
    return (
        <>
            <Game></Game>
        </>
    );
}