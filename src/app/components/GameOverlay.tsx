import { JSX } from "react";
import { GameStatus, PlayersArray } from "../../shared/types";
import { gameStrings } from "./gameStrings";

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
        if (!winner) throw new Error ("unexpected error, not player with hp > 0 found in state.players");
        return winner.name;
    }

    const waitingJsx = (<>
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg" style={{ color: 'var(--text-primary)' }}>{gameStrings.waitingForGameToStart}</p>
    </>);

    const finishedJsx = (<>
        <div className="stats shadow">
            <div className="stat">
                <div className="stat-title">Winner:</div>
                <div className="stat-value"> {winnerName()} </div>
                <div className="stat-desc">Well Done</div>
            </div>
        </div>
    </>)

    const mapping: { [key in GameStatus]: JSX.Element } = {
        "waiting": waitingJsx,
        "finished": finishedJsx,
        "playing": <></>
    };

    if (status == 'playing') {
        return null;
    }

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-overlay)' }}>
            <div className="panel" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                <div className="flex flex-col items-center p-6">
                    {mapping[status]}
                </div>
            </div>
        </div>
    );
}
