"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerHealth } from "@/app/components/PlayerHealth";

interface HealthDisplayProps {
    health: number;
}

export default function HealthDisplay({ health }: HealthDisplayProps) {
    const prevHealthRef = useRef(health);
    const [isDamaged, setIsDamaged] = useState(false);

    useEffect(() => {
        if (health < prevHealthRef.current) {
            setIsDamaged(true);
            const timer = window.setTimeout(() => setIsDamaged(false), 450);
            prevHealthRef.current = health;
            return () => window.clearTimeout(timer);
        }
        prevHealthRef.current = health;
    }, [health]);

    return (
        <div
            className={`flex items-center gap-2 px-4 py-2 panel rounded-lg ${
                isDamaged ? "animate-health-damage" : ""
            }`}
        >
            <PlayerHealth health={health} />
        </div>
    );
}
