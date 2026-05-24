import { IconHeart, IconCross } from "@/app/components/icons";

export function PlayerHealth({ health }: { health: number }) {
    return (
        <div className="flex min-w-0 w-full">
            {health > 0
                ? Array.from({ length: health }, (_, i) => (
                    <span key={i} className="flex-1 min-w-0 aspect-square inline-flex max-h-4 md:max-h-6">
                        <IconHeart className="size-4 md:size-6" />
                    </span>
                ))
                : (
                    <span className="flex-1 min-w-0 aspect-square inline-flex max-h-4 md:max-h-6">
                        <IconCross className="size-full" stroke="#a3a3a3" fill="none" />
                    </span>
                )}
        </div>
    );
}