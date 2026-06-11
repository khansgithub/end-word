"use client";

import { useRouter } from "next/navigation";

export default function Foo() {
    const router = useRouter();
    const onClick = () => {
        router.replace("/foo/bar");
    };
    return (
        <div>
            <p> foo </p>
            <button onClick={onClick}>Go to Bar</button>
        </div>
    );
}
