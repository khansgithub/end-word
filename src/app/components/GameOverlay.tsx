import { JSX } from "react";
import { GameStatus, PlayersArray } from "@/shared/types";
import { getWinnerPlayer } from "@/shared/utils";
import { gameStrings } from "@/app/lib/gameStrings";

interface GameOverlayProps {
    status: GameStatus;
    players: PlayersArray;
    connectedPlayers: number;
    isHost?: boolean;
    onStartGame?: () => void;
    onBackToLobby?: () => void;
    isStartingGame?: boolean;
}

export default function GameOverlay({
    status,
    players,
    connectedPlayers,
    isHost = false,
    onStartGame,
    onBackToLobby,
    isStartingGame = false,
}: GameOverlayProps) {
    function winnerName() {
        return getWinnerPlayer(players)?.name ?? gameStrings.noWinner;
    }

    function waitingJsx() {
        return (
            <>
                <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-lg" style={{ color: "var(--text-primary)" }}>
                    {gameStrings.waitingForGameToStart}
                </p>
                {isHost && onStartGame && (
                    <button
                        type="button"
                        className="btn-fsm mt-4"
                        onClick={onStartGame}
                        disabled={isStartingGame}
                        aria-busy={isStartingGame}
                    >
                        {isStartingGame ? gameStrings.startingGame : gameStrings.startGame}
                    </button>
                )}
            </>
        );
    }

    function finishedJsx() {
        return (
            <>
                <div className="stats shadow">
                    <div className="stat">
                        <div className="stat-title">Winner is:</div>
                        <div className="stat-value text-center"> {winnerName()} </div>
                        <div className="stat-desc text-center text-lg">Well Done</div>
                    </div>
                </div>
                {onBackToLobby && (
                    <button type="button" className="btn-fsm mt-4" onClick={onBackToLobby}>
                        Back to lobby
                    </button>
                )}
            </>
        );
    }

    const mapping: { [key in GameStatus]: () => JSX.Element } = {
        waiting: waitingJsx,
        finished: finishedJsx,
        playing: () => <></>,
    };

    if (status === "playing") {
        return null;
    }

    if (status === "waiting" && connectedPlayers < 2) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm"
            style={{ backgroundColor: "var(--bg-overlay)" }}
        >
            <div className="panel">
                <div className="flex flex-col items-center p-6">{mapping[status]()}</div>
            </div>
        </div>
    );
}
