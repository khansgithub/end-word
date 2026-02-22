import { BoolMap, PropertyBoolMap } from "../../shared/types";
import type { Player as PlayerType } from "../../shared/types";
import { buildStyles } from "../lib/playerUtil";
import { PlayerHealth } from "./PlayerHealth";
import { PlayerPanel } from "./PlayerPanel";

interface Props {
    player: PlayerType
    turn: boolean,
    lastWord?: string,
    isCurrentPlayer?: boolean
}

export default function Player(props : Props) {
    const { player, turn, lastWord, isCurrentPlayer } = props;
    const styles = buildStyles(props);
    const playerPanelParams = {
        type: "player",
        styles: styles,
        playerName: props.player.name,
        isCurrentPlayer: props.isCurrentPlayer ?? false,
        lastWord: props.lastWord!,
        turn: props.turn,
        health: props.player.health,
    } as const;
    return (
        <>
        <PlayerPanel {...playerPanelParams} />
        {/* <div // panel
            className={`w-24 min-w-0 md:w-32 rounded-full transition-all duration-300 relative flex align-center flex-col shrink-0 pb-2 md:pb-[0.85rem] ${styles.panelClassName}`}
            style={{
                borderColor: styles.borderColor,
                borderWidth: styles.borderWidth,
                transform: styles.transform,
                marginTop: styles.marginTop,
            }}
        >

            <div className="flex flex-col items-center px-2 pt-2 pb-1 md:p-3"> 
                <div className="avatar placeholder">
                    <div
                        className="flex flex-col justify-center items-center rounded-full w-12 h-12 md:w-16 md:h-16 transition-all duration-300"
                        style={{
                            background: styles.avatarBackground,
                            border: styles.avatarBorder,
                            color: 'var(--text-primary)',
                            boxShadow: styles.avatarBoxShadow,
                        }}
                    >
                        <span className="text-lg md:text-2xl font-bold">{player.name[0]?.toUpperCase() || '?'}</span>
                    </div>
                </div>

                <h3 className={`${styles.nameClassName} truncate max-w-full`} style={{
                    color: styles.nameColor,
                    marginTop: '0.25rem',
                }}>
                    {player.name}
                    <br />
                    {isCurrentPlayer && (<span className="text-xs md:text-sm">(you)</span>)}

                </h3>

                <p className="text-[0.65rem] md:text-xs text-center truncate w-full mt-0.5 md:mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {lastWord}
                </p>


                {turn && (
                    <div className="chip mt-0.5 md:mt-1 text-[0.6rem] md:text-[0.68rem]" style={{
                        borderColor: styles.borderColor,
                        color: 'var(--text-success-light)',
                    }}>
                        <span className="chip-dot"></span>
                        Turn
                    </div>
                )}

                <div className="pt-1 md:pt-2">
                    <PlayerHealth health={player.health}></PlayerHealth>
                </div>
            </div>
        </div> */}
        </>
    );
}
