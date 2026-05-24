import { PlayerHealth } from "@/app/components/PlayerHealth";

interface HealthDisplayProps {
    health: number;
}

export default function HealthDisplay({ health }: HealthDisplayProps) {
    return (
        <div className="flex items-center gap-2 px-4 py-2 panel rounded-lg">
            {/* <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}></span> */}
            <PlayerHealth health={health}></PlayerHealth>
        </div>
    );
}
