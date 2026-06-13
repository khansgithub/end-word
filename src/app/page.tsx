"use client";

import { Suspense, memo, useEffect, useRef, useState } from "react";
import { buildInitialGameState } from "@/shared/GameState";
import InputBox from "@/app/components/game/InputBox";
import { Homescreen } from "@/app/components/Homescreen";

export default function Page() {
	const [data, setData] = useState(0);
	// const foobar2 = foobar(data);
	// const onChange = foobar(data);

	function onClick() {
		setData((v) => v + 1);
	}

	return (
		// <Game></Game>
		<Suspense fallback={null}>
			<Homescreen />
		</Suspense>
		// <InputBox matchLetter={buildInitialGameState().matchLetter} disabled={false}></InputBox>
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