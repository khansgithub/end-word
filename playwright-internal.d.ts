/**
 * Type declarations for Playwright internal APIs.
 * These are not officially supported and may change between versions.
 */
declare module "playwright/lib/runner/testRunner" {
    export function runAllTestsWithConfig(config: unknown): Promise<"passed" | "failed" | "interrupted">;
}

declare module "playwright/lib/common/configLoader" {
    export function loadConfigFromFile(
        configFile?: string,
        overrides?: object,
        ignoreDeps?: boolean
    ): Promise<{
        cliArgs?: string[];
        cliGrep?: string;
        [key: string]: unknown;
    }>;
}
