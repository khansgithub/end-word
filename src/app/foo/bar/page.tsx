"use client";

import { useRouter } from "next/navigation";

export default function Bar() {
    const router = useRouter();
    const onClick = () => {
        router.replace("/foo");
    };
    return (
        <div>
            <p> bar </p>
            <button onClick={onClick}>Go to Foo</button>
        </div>
    );
}
