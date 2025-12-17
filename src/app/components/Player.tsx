import { Player } from "../../shared/types";

interface props {
    player: Player
    turn: boolean,
    lastWord?: string
}

export default function ({ player, turn, lastWord}: props) {
    return (
        <div className={[
            "flex flex-col justify-center items-center p-3 aspect-square w-40 border-5 border-blue-100",
            `${turn ? "border-blue-400" : ""}`
        ].join(" ")}>
            <p>Player: <span>{player.name}</span></p>
            <p><span className="text-pink-400">{lastWord}</span></p>
        </div>
    );
}
