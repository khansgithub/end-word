import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@tests": path.resolve(__dirname, "./tests"),
            "@scripts": path.resolve(__dirname, "./scripts"),
            "@root": path.resolve(__dirname, "."),
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: "./tests/unit/setup.ts",
        globals: true,
        include: ["tests/unit/**/*.test.ts"],
        exclude: ["tests/e2e/**"],
    },
});
