import { Dispatch } from "react";
import { gameStrings } from "@/lib/client/ui/game-strings";

interface props {
    setUserIsConnected: Dispatch<boolean>,
}

function LoadingScreen(props: props){
    function connect() {
        props.setUserIsConnected(true);
    }
    return (
        <div
            className="app-ui flex min-h-dvh w-full flex-col items-center justify-center p-4"
            style={{ backgroundColor: "var(--b-bg)", fontFamily: "var(--font-b-sans)" }}
        >
            <div className="panel w-full max-w-md">
                <div className="flex flex-col items-center text-center p-6">
                    <h2
                        className="text-xl font-normal mb-4"
                        style={{ fontFamily: "var(--font-b-display)", color: "var(--b-fg)" }}
                    >
                        {gameStrings.connectionRequired}
                    </h2>
                    <p className="mb-6 text-sm" style={{ color: "var(--b-muted)" }}>
                        {gameStrings.pleaseConnectToJoin}
                    </p>
                    <button
                        className="btn-fsm px-6 py-3 text-base"
                        onClick={connect}
                    >
                        <span>{gameStrings.playIcon}</span>
                        {gameStrings.connectButtonText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LoadingScreen;
