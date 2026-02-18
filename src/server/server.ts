import "dotenv/config";
import express from "express";
import next from "next";

import { createServer } from "node:http";
import { getRandomWordFromDictionary } from "../shared/api";
import { buildInitialGameState } from "../shared/GameState";
import { setGameState } from "./state";
import { createIOServer } from "./socket";
import { setupRoutes } from "./routes";
import { NodeJS } from "../app/env";


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
    "MOCK_WORD_VALIDATION",
    "MOCK_WORD_VALIDATION_FAIL",
];

/**
 * Start the server.
 */
async function startServer(): Promise<void> {
    await app.prepare();
    express_app.use(express.json());
    setupRoutes(express_app, app, enableTestEndpoints);

    server.listen(port, () => {
        console.log(`server running at http://localhost:${port}`);
    });
}

function main(){
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

console.log("Env variables:", (() => { return envVars.map(v => `${v}=${process.env[v]}`) })());

main();