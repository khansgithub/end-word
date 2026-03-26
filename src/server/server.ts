import "./env";
import express from "express";
import next from "next";
import { createServer } from "node:http";
import { NodeJS } from "../app/env";
import { envGet } from "./env";
import { buildInitialGameState } from "../shared/GameState";
import { getRandomWordFromDictionary } from "./api";
import { initLogging, log } from "./logging";
import { setupRoutes } from "./routes";
import { createIOServer } from "./socket";
import { setGameState } from "./state";
import { pp } from "../shared/utils";


// --- Logging lifecycle: init early ---
initLogging();

const app = next({
    dev: envGet("NODE_ENV") !== "production",

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