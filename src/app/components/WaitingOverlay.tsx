import { GameStatus } from "@/shared/types";
import { gameStrings } from "@/lib/client/ui/game-strings";

interface WaitingOverlayProps {
    status: GameStatus;
}

export default function WaitingOverlay({ status }: WaitingOverlayProps) {
    if (status !== 'waiting') {
        return null;
    }

    return (
        <div
            className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm"
            style={{ backgroundColor: "var(--b-overlay)" }}
        >
            <div className="panel">
                <div className="flex flex-col items-center p-6">
                    <div className="app-spinner mb-4" aria-hidden />
                    <p className="text-lg" style={{ color: "var(--b-fg)" }}>{gameStrings.waitingForGameToStart}</p>
                </div>
            </div>
        </div>
    );
}
