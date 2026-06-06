import { GameStateClient, PlayersArray, PlayerWithId } from "@/shared/types";
import { isPlayerTurn } from "@/shared/utils";
import { gameStrings } from "@/lib/client/ui/game-strings";
import Player from "@/app/components/Player";
import { PlayerPanel } from "@/app/components/PlayerPanel";

interface PlayersSectionProps {
    gameState: GameStateClient;
}

export default function PlayersSection({ gameState }: PlayersSectionProps) {
    return (
        <div className="panel w-dvw md:w-full"><div className="px-4">
            <h3 className="md:text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{gameStrings.players}</h3>
            <div className="flex flex-row flex-wrap gap-4 justify-center items-start" id="players">
                {RenderPlayerArray(gameState.players, gameState.turn, gameState.connectedPlayers, gameState.thisPlayer)}
            </div>
        </div></div>
    );
}

function RenderEmptyPlayerPanel(i: number) {
    return (
        <PlayerPanel
        key={i}
        type="empty"
        playerName={gameStrings.emptySeat}
    />
        // <>

            // {/* <div
            //     key={i}
            //     className="panel w-32 opacity-50"
            // >
            //     <div className="flex flex-col items-center p-3">
            //         <div className="avatar placeholder">
            //             <div className="flex flex-col justify-center items-center rounded-full w-16 h-16" style={{
            //                 background: 'var(--gradient-avatar-empty)',
            //                 border: '1px solid var(--border-default)',
            //             }}>
            //                 <span className="text-2xl " style={{ color: 'var(--text-secondary)' }}>{gameStrings.emptySeat}</span>
            //             </div>
            //         </div>
            //         <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{gameStrings.empty}</p>
            //     </div>
            // </div> */}
        // </>

    );
}

function RenderPlayerArray(players: PlayersArray, turn: number, connectedPlayers: number, thisPlayer?: PlayerWithId) {
    return players.map((p, i) => {
        if (p === null) return RenderEmptyPlayerPanel(i);
        const isCurrentPlayer = thisPlayer?.seat === i;
        return (
            <Player
                key={i}
                player={p}
                turn={isPlayerTurn({ turn, connectedPlayers }, i)}
                lastWord={p.lastWord}
                isCurrentPlayer={isCurrentPlayer}
            />
        );
    })

}