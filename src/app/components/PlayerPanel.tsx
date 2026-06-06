import { GameState } from "@/app/foo/foo2-1";
import { Player as PlayerType } from "@/shared/types";
import { PlayerHealth } from "@/app/components/PlayerHealth";
import { gameStrings } from "@/lib/client/ui/game-strings";

type PanelTypes = "player" | "empty";

type PlayerPanelProps = {
    playerName: string
} & ({
    type: "player"
    styles: any,
    isCurrentPlayer: boolean,
    lastWord: string,
    turn: boolean,
    health: number,
} | {
    type: "empty"
    styles?: undefined,
    isCurrentPlayer?: undefined,
    lastWord?: undefined,
    turn?: undefined,
    health?: undefined,
});

const baseStyles = {
    panel: "panel w-20 md:w-32 min-w-0 aspect-[4/6] p-0!",
    avatar: "avatar placeholder",
    avatarInner: "flex flex-col justify-center items-center rounded-full w-7 aspect-square md:w-16 md:h-16",
    avatarText: "text-sm md:text-2xl",
    panelText: "truncate md:max-w-full text-center"
};

const playerStyles = {
    panel: "transition-all duration-300 relative flex align-center flex-col shrink-0 pb-2 md:pb-[0.85rem]",
    avatarInner: "transition-all duration-300",
    avatarText: "font-bold",
    panelText: "md:mt-[0.25rem] mt-0 text-xs"
}

const emptyStyles = {
    panel: "opacity-50",
    avatar: "mb-1 md:mb-2",
    avatarInner: "border border-[var(--border-default)] bg-[var(--gradient-avatar-empty)]",
    avatarText: "text-2xl text-[var(--text-secondary)]",
    panelText: "text-xs mt-2",
}

function styleRules(styles: any) {
    // throw new Error("test");
    return {
        panel: {
            borderColor: styles.borderColor,
            borderWidth: styles.borderWidth,
            transform: styles.transform,
            marginTop: styles.marginTop,
        },
        avatarInner: {
            background: styles.avatarBackground,
            border: styles.avatarBorder,
            color: 'var(--text-primary)',
            boxShadow: styles.avatarBoxShadow,
        },
        panelText: {
            color: styles.nameColor,
        }
    }
};

export function PlayerPanel({ type, styles, playerName, isCurrentPlayer, lastWord, turn, health }: PlayerPanelProps) {
    const isPlayer = (type === "player") && (styles != undefined);
    const sr = isPlayer ? styleRules(styles) : {} as any;

    function getClassName(type: "player" | "empty", key: string) {
        const baseStyle = baseStyles[key as keyof typeof baseStyles] ?? "";
        const playerStyle = playerStyles[key as keyof typeof playerStyles] ?? "";
        const emptyStyle = emptyStyles[key as keyof typeof emptyStyles] ?? "";
        return `${baseStyle} ${isPlayer ? playerStyle : emptyStyle}`
    };

    /**
     * Section with Player name, last word, turn chip, health
     * @returns 
     */
    function playerSection() {
        return (
            <>
                <p className="text-[0.65rem] md:text-xs text-center truncate w-full mt-0.5 md:mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {lastWord}
                </p>


                {turn && (
                    <div className="chip mt-0.5 md:mt-1 text-[0.68rem] md:scale-0 scale-75" style={{
                        borderColor: styles.borderColor,
                        color: 'var(--text-success-light)',
                    }}>
                        <span className="chip-dot"></span>
                        Turn
                    </div>
                )}

                <div className="pt-1 md:pt-2">
                    <PlayerHealth health={health!}></PlayerHealth>
                </div>
            </>
        )
    }

    function emptySection() {
        return (
            <p
                className={"text-xs mt-2"}
                style={{ color: 'var(--text-secondary)' }}>{gameStrings.empty}</p>
        );
    }

    return (
        <div className={`${getClassName(type, "panel")} ${isPlayer ? styles.panelClassName : ''}`} style={sr.panel}>
            <div className="flex flex-col items-center px-2 pt-2 pb-1 md:p-3">
                <div className={`${getClassName(type, "avatar")}`}>
                    <div className={`${getClassName(type, "avatarInner")}`} style={sr.avatarInner}>
                        <span className={`${getClassName(type, "avatarText")}`}>
                            {playerName}
                        </span>
                    </div>
                </div>

                <h3 className={`${getClassName(type, "panelText")}`} style={sr.panelText}>
                    {isPlayer
                        ? playerName
                        : gameStrings.empty
                    }

                    {isPlayer && <br/>}

                    {isPlayer && isCurrentPlayer && (<span className="text-xs md:text-sm">(you)</span>)}

                    {/* <br /> */}
                    {/* {isCurrentPlayer && (<span className="text-xs md:text-sm">(you)</span>)} */}
                </h3>

                {isPlayer && playerSection()}

            </div>
        </div>
    );
}