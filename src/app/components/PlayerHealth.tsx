"use client";

import { useEffect, useRef, useState } from "react";
import { IconHeart, IconCross } from "@/app/components/icons";

export function PlayerHealth({ health }: { health: number }) {
    const prevHealthRef = useRef(health);
    const [losingHeartIndex, setLosingHeartIndex] = useState<number | null>(null);
    const [displayCount, setDisplayCount] = useState(health);
    const [slotCount, setSlotCount] = useState(() => Math.max(health, 0));

    useEffect(() => {
        const prevHealth = prevHealthRef.current;
        if (health < prevHealth && prevHealth > 0) {
            setDisplayCount(prevHealth);
            setLosingHeartIndex(health);
            const timer = window.setTimeout(() => {
                setLosingHeartIndex(null);
                setDisplayCount(health);
            }, 500);
            prevHealthRef.current = health;
            return () => window.clearTimeout(timer);
        }

        prevHealthRef.current = health;
        setDisplayCount(health);
        setLosingHeartIndex(null);
        if (health > prevHealth) {
            setSlotCount(health);
        }
    }, [health]);

    const heartsToShow = Math.max(displayCount, health);

    useEffect(() => {
        setSlotCount((count) => Math.max(count, heartsToShow));
    }, [heartsToShow]);

    if (health <= 0 && losingHeartIndex === null) {
        return (
            <div className="flex min-w-0 w-full">
                <span className="flex-1 min-w-0 aspect-square inline-flex max-h-4 md:max-h-6 items-center justify-center">
                    <IconCross className="size-full max-h-4 md:max-h-6" stroke="#a3a3a3" fill="none" />
                </span>
            </div>
        );
    }

    return (
        <div className="flex min-w-0 w-full" aria-live="polite" aria-atomic="true">
            {Array.from({ length: slotCount }, (_, i) => {
                const isLosing = losingHeartIndex !== null && i === losingHeartIndex;
                const isVisible = i < heartsToShow;

                if (!isVisible) {
                    return (
                        <span
                            key={i}
                            className="flex-1 min-w-0 aspect-square inline-flex max-h-4 md:max-h-6"
                            aria-hidden
                        />
                    );
                }

                return (
                    <span
                        key={i}
                        className={`flex-1 min-w-0 aspect-square inline-flex max-h-4 md:max-h-6 items-center justify-center ${
                            isLosing ? "animate-heart-loss" : ""
                        }`}
                        aria-hidden={isLosing}
                    >
                        <IconHeart className="size-4 md:size-6" />
                    </span>
                );
            })}
        </div>
    );
}
