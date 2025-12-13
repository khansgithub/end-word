"use client";

import { FormEvent, memo, ReactEventHandler, RefObject, useRef } from "react";

// function Foo({onChange}: {onChange: ()=>{}}) {
//     return (
//             <input className="border-2 border-green-200"  onChange={onChange} />
//     )
// }


function Foo({onChange}: {onChange: ()=>{}}) {
    return (
        <input className="border-2 border-green-200" onChange={onChange}/>
    )
};

export default memo(Foo, (prevProps, nextProps): boolean => {
    console.log("prev", prevProps);
    console.log("next", nextProps);
    return false;
});



// export default memo(Foo);