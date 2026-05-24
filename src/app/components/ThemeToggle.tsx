"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@/app/components/icons";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">("dark");

    useEffect(() => {
        // Get initial theme from data attribute or default to dark
        const currentTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
        if (currentTheme) {
            setTheme(currentTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
        // Store preference in localStorage
        localStorage.setItem("theme", newTheme);
    };

    const svgProps = {
        className: "size-6",
        stroke: "var(--color-neutral-dark)",
    };

    const iconComponent = theme === "dark" ? IconSun : IconMoon;

    useEffect(() => {
        // Load theme preference from localStorage on mount
        const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute("data-theme", savedTheme);
        }
    }, []);

    return (
        <button
            onClick={toggleTheme}
            className="fixed top-4 right-4 z-50 p-3 rounded-full border transition-all duration-200"
            style={{
                background: "var(--color-neutral-light)",
                borderColor: "var(--bg-secondary-solid)",
                color: "var(--color-neutral-dark)",
                boxShadow: "var(--shadow-button)",
            }}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
            {iconComponent({ ...svgProps })}
        </button>
    );
}

