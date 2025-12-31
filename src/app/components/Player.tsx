import { Player } from "../../shared/types";

interface props {
    player: Player
    turn: boolean,
    lastWord?: string
}

export default function ({ player, turn, lastWord }: props) {
    return (
        // <div className={[
        //     "flex flex-col justify-center items-center p-3 aspect-square w-40 border-5 border-blue-100",
        //     `${turn ? "border-blue-400" : ""}`
        // ].join(" ")}>
        //     <p>Player: <span>{player.name}</span></p>
        //     <p><span className="text-pink-400">{lastWord}</span></p>
        // </div>
        <div className="flex flex-col justify-center items-center w-20 m-1">
            <div className="avatar avatar-placeholder w-full pb-2">
                <div className={[
                    "bg-neutral text-neutral-content rounded-full w-full",
                    player.uid !== undefined ? "ring-primary ring-offset-base-100 ring-2 ring-offset-2 animate-glow-filter" : ""
                ].join(" ")}>
                    <p><span className="text-3xl"><span>{player.name}</span></span></p>
                </div>
            </div>
            <div className={`${turn ? "" : "opacity-0"}`}><div className="badge badge-info">turn</div></div>
        </div>
    );
}
