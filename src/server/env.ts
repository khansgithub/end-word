import dotenv from "dotenv";
import { NodeJS as _NodeJs } from "../app/env";

export type AppEnv = _NodeJs.ProcessEnv & NodeJS.ProcessEnv;

const envMap = {
    "production": ".env.prod",
    "development": ".env",
};

dotenv.config(
    envMap[process.env.NODE_ENV as keyof typeof envMap]
        ? { path: envMap[process.env.NODE_ENV as keyof typeof envMap]! }
        : undefined
);

/**
 * Get an environment variable by key.
 * @returns The value or undefined if not set.
 */
export function envGet(key: keyof AppEnv): string | undefined {
    return process.env[key];
}

/**
 * Get an environment variable, or a default value if not set.
 */
export function envGetOr(key: keyof AppEnv, defaultValue: string): string {
    const value = process.env[key];
    return value !== undefined ? value : defaultValue;
}

/**
 * Check if an environment variable is set (and non-empty).
 */
export function envHas(key: keyof AppEnv): boolean {
    const value = process.env[key];
    return value !== undefined && value !== "";
}

/**
 * Set an environment variable. Primarily for test setup.
 */
export function envSet(key: keyof AppEnv, value: string): void {
    process.env[key] = value;
}
