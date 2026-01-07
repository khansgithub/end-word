"use client";

import { useEffect, useState } from "react";

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
                background: theme === "dark" 
                    ? "var(--gradient-button)" 
                    : "var(--gradient-button)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
                boxShadow: "var(--shadow-button)",
            }}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
            {theme === "dark" ? "☀️" : "🌙"}
        </button>
    );
}

