import { JSX } from "react";
import { NoWinnerFoundError } from "../../shared/errors";
import { GameStatus, PlayersArray } from "../../shared/types";
import { gameStrings } from "../lib/gameStrings";

interface GameOverlayProps {
    status: GameStatus;
    players: PlayersArray;
}

// type GameOverOverlayProps = {
//     status: 'finished',
// } | {
//     status: 'waiting'
// }

export default function GameOverlay({ status, players }: GameOverlayProps) {
    function winnerName() {
        const winner = players.find(p => p && p.health !== 0);
        if (!winner) throw new NoWinnerFoundError({players});
        return winner.name;
    }

    function waitingJsx() {
        return (<>
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg" style={{ color: 'var(--text-primary)' }}>{gameStrings.waitingForGameToStart}</p>
        </>);
    }

    function finishedJsx() {
        return (<>
            <div className="stats shadow">
                <div className="stat">
                    <div className="stat-title">Winner is:</div>
                    <div className="stat-value text-center"> {winnerName()} </div>
                    <div className="stat-desc text-center text-lg">Well Done</div>
                </div>
            </div>
        </>);
    }

    const mapping: { [key in GameStatus]: () => JSX.Element } = {
        "waiting": waitingJsx,
        "finished": finishedJsx,
        "playing": () => <></>
    };

    console.log(`[GameOverlay]: status: ${status}`);

    if (status == 'playing') {
        return null;
    }

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-overlay)' }}>
            <div className="panel">
                <div className="flex flex-col items-center p-6">
                    {mapping[status]()}
                </div>
            </div>
        </div>
    );
}
