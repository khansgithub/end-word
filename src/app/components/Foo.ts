/* eslint-disable @typescript-eslint/no-unused-vars */
// "use client";

// import { useState } from "react";

// type foobar = {
//     foo: string,
//     bar: string
// }

// function foo () : foobar{
//     return null;
// } 


type functionMap = {
    [K in keyof typeof functions]:
    {
        type: K
        payload: Parameters<typeof functions[K]>
    }
}[keyof typeof functions];

// type fmap<T extends typeof functions> = {
//     [K in keyof T]: {
//         type: K,
//         // payload: Parameters<T[K]>,
//     }
// };

type fmap<T extends typeof functions> = T extends T ? [keyof T, ...Parameters<T[keyof T]>] : never;;

const asd:fmap<typeof functions> = ["foo", 1];

const functions = {
    foo,
    bar,
    foobar,
} satisfies {[key: string]: (...args: any[]) => unknown};

function foo(num: number) { };
function bar(str: string) { };
function foobar(num: number, str: string) { };

declare const data: functionMap;
const f = functions[data.type];

function call<K extends keyof typeof functions>(
    data: { type: K; payload: Parameters<typeof functions[K]> }
) {
    return functions[data.type](...data.payload);
}


// (...data.payload);