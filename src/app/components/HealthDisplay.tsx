interface HealthDisplayProps {
    health: number;
}

export default function HealthDisplay({ health }: HealthDisplayProps) {
    return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}></span>
            <div className="flex gap-1">
                {Array.from({ length: health }, (_, i) => (
                    <span key={i} className="text-xl" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6.02 4.02 4 6.5 4c1.74 0 3.41 1.01 4.13 2.44h.74C14.09 5.01 15.76 4 17.5 4 19.98 4 22 6.02 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </span>
                ))}
            </div>
        </div>
    );
}
