import { Player as PlayerClass } from "../classes";

interface props {
    player: PlayerClass
    turn: boolean,
    lastWord?: string
}

export default function Player({ player, turn }: props) {
    return (
        <div className={[
            "flex justify-center items-center p-3 aspect-square w-40 border-5 border-blue-100",
            `${turn ? "border-blue-400" : ""}`
        ].join(" ")}>
            <p>Player: <span>{player.name}</span></p>
            <p><span className="text-pink-400"></span></p>
        </div>
    );
}
