import { GameStatus } from "../../shared/types";
import { gameStrings } from "./gameStrings";

interface WaitingOverlayProps {
    status: GameStatus;
}

export default function WaitingOverlay({ status }: WaitingOverlayProps) {
    if (status !== 'waiting') {
        return null;
    }

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-overlay)' }}>
            <div className="panel" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                <div className="flex flex-col items-center p-6">
                    <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-lg" style={{ color: 'var(--text-primary)' }}>{gameStrings.waitingForGameToStart}</p>
                </div>
            </div>
        </div>
    );
}
