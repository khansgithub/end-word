import "@/server/env";
import express from "express";
import next from "next";
import { createServer } from "node:http";
import { NodeJS } from "@/app/env";
import { envGet } from "@/server/env";
import { buildInitialGameState } from "@/shared/GameState";
import { getRandomWordFromDictionary } from "@/server/api";
import { initLogging, log } from "@/server/logging";
import { setupRoutes } from "@/server/routes";
import { createIOServer } from "@/server/socket";
import { setGameState } from "@/server/state";
import { pp } from "@/shared/utils";


// --- Logging lifecycle: init early ---
initLogging();

const app = next({
    dev: envGet("NODE_ENV") !== "production",
    // customServer: true,
    // dir: "src",
    // conf: {
    //     ...nextConfig,
    //     // When dir is "src", Next.js resolves distDir relative to src/, so "src/.next/" becomes src/src/.next/.
    //     // Override with absolute path so it finds the build at project_root/src/.next/
    //     // distDir: path.resolve(process.cwd(), "src", ".next"),
    // },

});
const express_app = express();
const server = createServer(express_app);
const port = envGet("PORT") ? parseInt(envGet("PORT")!, 10) : 4000;
const enableTestEndpoints = envGet("NODE_ENV") === "test" || envGet("PLAYWRIGHT_TEST") === "true";
const envVars: Array<keyof NodeJS.ProcessEnv> = [
    "DICTIONARY_URL",
    "SERVER",
    "SUPPRESS",
    "PLAYWRIGHT_TEST",
    "MOCK_GET_RANDOM_WORD",
    "MOCK_LOOKUP_WORD",
    "MOCK_WORD_VALIDATION_FAIL",
    "MOCK_DICTIONARY_DATA",
];

/**
 * Start the server.
 */
async function startServer(): Promise<void> {
    await app.prepare();
    express_app.use(express.json());
    setupRoutes(express_app, app, enableTestEndpoints);

    server.listen(port, "0.0.0.0", () => {
        log(`server running at http://localhost:${port}`)();
    });
}

function main() {
    getRandomWordFromDictionary()
        .catch(err => {
            console.error("Error getting random word from dictionary", err);
            process.exit(1);
        })
        .then(word => {
            setGameState(buildInitialGameState(word.slice(-1)));
            createIOServer(server);
            return startServer();
        })
        .catch(err => {
            console.error("Error setting up game state", err);
            process.exit(1);
        });
}

log(
    "Env variables:",
    pp([...envVars, "NODE_ENV"].map(v => `${v}=${envGet(v)}`))
)();

main();