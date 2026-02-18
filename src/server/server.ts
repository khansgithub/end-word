import "dotenv/config";
import express from "express";
import next from "next";

import { createServer } from "node:http";
import { getRandomWordFromDictionary } from "./api";
import { buildInitialGameState } from "../shared/GameState";
import { setGameState } from "./state";
import { createIOServer } from "./socket";
import { setupRoutes } from "./routes";
import { initLogging, log } from "./logging";
import { NodeJS } from "../app/env";

// --- Logging lifecycle: init early ---
initLogging();

const app = next({ dev: true, dir: "src" });
const express_app = express();
const server = createServer(express_app);

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;

const enableTestEndpoints = process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "true";

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

    server.listen(port, () => {
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

log("Env variables:", envVars.map(v => `${v}=${process.env[v]}`).join(", "))();

main();