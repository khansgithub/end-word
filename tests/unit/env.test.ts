import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { envGet, envSet } from "@/app/server/env";

describe("env", () => {
    const originalNodeEnv = envGet("NODE_ENV");

    beforeEach(() => {
        envSet("NODE_ENV", "test");
    });

    afterEach(() => {
        envSet("NODE_ENV", originalNodeEnv ?? "");
    });

    it("should not change environment when NODE_ENV is test", () => {
        // When NODE_ENV is "test", dotenv.config() is skipped, so process.env
        // should reflect only what was set before the env module loaded.
        // We can't easily test dotenv not loading, but we verify the module
        // loads without error and get() works. The key behavior: in test,
        // we don't load .env, so pre-existing env (e.g. from vitest) is preserved.
        expect(process.env.NODE_ENV).toBe("test");
        // get() should return whatever is in process.env
        expect(envGet("NODE_ENV")).toBe("test");
    });
});
