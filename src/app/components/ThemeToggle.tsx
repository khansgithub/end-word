"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@/app/components/icons";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">("dark");

    useEffect(() => {
        const currentTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
        if (currentTheme) {
            setTheme(currentTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    };

    const iconComponent = theme === "dark" ? IconSun : IconMoon;

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute("data-theme", savedTheme);
        }
    }, []);

    return (
        <button
            onClick={toggleTheme}
            className="fixed top-4 right-4 z-50 flex size-11 items-center justify-center rounded-xl border transition-colors duration-150"
            style={{
                background: "var(--b-surface)",
                borderColor: "var(--b-surface-border)",
                color: "var(--b-fg)",
                boxShadow: "var(--b-shadow-card)",
            }}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
            {iconComponent({ className: "size-5", stroke: "currentColor" })}
        </button>
    );
}
