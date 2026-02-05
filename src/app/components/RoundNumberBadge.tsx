import { gameStrings } from "./gameStrings";

export function RoundNumberBadge({ turn }: { turn: number }) {
    return (
        <div className="chip px-6 py-2" style={{
            borderColor: 'var(--border-accent)',
            color: 'var(--text-secondary)',
        }}>
            {`${gameStrings.round}${turn ?? 1}`}
        </div>)
}