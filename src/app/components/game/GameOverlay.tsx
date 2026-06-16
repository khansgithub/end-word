import { JSX } from "react";
import { GameStatus, PlayersArray, PlayerWithId, PlayerWithoutId } from "@/shared/types";
import { getWinnerPlayer } from "@/shared/utils";
import { gameStrings } from "@/lib/client/ui/game-strings";

interface GameOverlayProps {
    status: GameStatus;
    players: PlayersArray;
    connectedPlayers: number;
    isHost?: boolean;
    onStartGame?: () => void;
    onBackToLobby?: () => void;
    isStartingGame?: boolean;
    isLeavingLobby?: boolean;
}

export default function GameOverlay({
    status,
    players,
    connectedPlayers,
    isHost = false,
    onStartGame,
    onBackToLobby,
    isStartingGame = false,
    isLeavingLobby = false,
}: GameOverlayProps) {
    function winnerName() {
        return getWinnerPlayer(players)?.name ?? gameStrings.noWinner;
    }

    function waitingJsx() {
        if (isStartingGame) {
            return (
                <>
                    <div className="app-spinner mb-4" aria-hidden />
                    <p className="text-lg" style={{ color: "var(--b-fg)" }}>
                        {gameStrings.startingGameOverlay}
                    </p>
                </>
            );
        }

        const activePlayers = players.filter((p): p is NonNullable<typeof p> => p != null) as PlayerWithoutId[];

        return (
            <>
                <div className="app-spinner mb-4" aria-hidden />
                <p className="text-lg" style={{ color: "var(--b-fg)" }}>
                    {gameStrings.waitingForGameToStart}
                </p>
                <div className="mt-4 w-full max-w-xs">
                    <p className="text-sm font-semibold mb-2" style={{ color: "var(--b-fg)" }}>
                        Players ({activePlayers.length})
                    </p>
                    <ul className="space-y-1">
                        {activePlayers.map((p, i) => (
                            <li
                                key={i}
                                className="flex items-center gap-2 px-3 py-1.5 rounded"
                                style={{ backgroundColor: "var(--b-bg)", color: "var(--b-fg)" }}
                            >
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                <span className="text-sm truncate">{p.name}</span>
                                {p.left && (
                                    <span className="text-xs ml-auto" style={{ color: "var(--b-muted)" }}>
                                        {gameStrings.playerLeft}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                {isHost && onStartGame && (
                    <button
                        type="button"
                        className="btn-fsm mt-4"
                        onClick={onStartGame}
                        disabled={isStartingGame}
                        aria-busy={isStartingGame}
                    >
                        {gameStrings.startGame}
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
                    <button
                        type="button"
                        className="btn-fsm mt-4 inline-flex items-center justify-center gap-2 min-w-[10rem]"
                        onClick={onBackToLobby}
                        disabled={isLeavingLobby}
                        aria-busy={isLeavingLobby}
                    >
                        {isLeavingLobby && (
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                        )}
                        {isLeavingLobby ? gameStrings.leavingRoom : "Back to lobby"}
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
            style={{ backgroundColor: "var(--b-overlay)" }}
        >
            <div className="panel min-w-[20rem] min-h-[14rem]">
                <div className="flex flex-col items-center p-6">{mapping[status]()}</div>
            </div>
        </div>
    );
}
