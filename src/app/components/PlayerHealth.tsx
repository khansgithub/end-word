import { IconHeart, IconCross } from "./icons";

export function PlayerHealth({ health }: { health: number }) {
    return (
        <div className="flex gap-1 min-w-0 w-full">
            {health > 0
                ? Array.from({ length: health }, (_, i) => (
                    <span key={i} className="flex-1 min-w-0 aspect-square inline-flex" style={{ maxHeight: "1.5rem" }}>
                        <IconHeart className="size-6" />
                    </span>
                ))
                : (
                    <span className="flex-1 min-w-0 aspect-square inline-flex" style={{ maxHeight: "1.5rem" }}>
                        <IconCross className="size-full" stroke="#a3a3a3" fill="none" />
                    </span>
                )}
        </div>
    );
}