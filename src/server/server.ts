import "dotenv/config";
import express from "express";
import next from "next";

import { createServer } from "node:http";
import { buildInitialGameState } from "../shared/GameState";
import { isDictionaryEntry } from "../shared/guards";
import { DictionaryResponse } from "../shared/types";
import { registry } from "./metrics";
import { setGameState } from "./serverGameState";
import { createIOServer, getServerSocketContext } from "./socket";
import { getRandomWordFromDictionary } from "../shared/api";

const app = next({ dev: true, dir: "src" });
const express_app = express();
const server = createServer(express_app);

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const dictionaryUrl = process.env.DICTIONARY_URL || "http://localhost:8000";

const enableTestEndpoints = process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "1";

getRandomWordFromDictionary()
    .catch(err => {
        console.error("Error getting random word from dictionary", err);
        process.exit(1);
    })
    .then(word => {
        setGameState(buildInitialGameState(word.slice(-1)));
        createIOServer(server);
        return startServer();
    }).catch(err => {
        console.error("Error setting up game state", err);
        process.exit(1);
    });


async function startServer(): Promise<void> {
    /**
     * Start the server and listen for requests.
     */

    await app.prepare();
    express_app.use(express.json());

    /**
     * Handle metrics requests, used for monitoring the server + testing.
     */
    express_app.get("/metrics", async (_req, res) => {
        try {
            res.set("Content-Type", registry.contentType);
            res.send(await registry.metrics());
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    });

    /**
     * Handle endpoint for getting the server logs, used for testing.
     */
    if (enableTestEndpoints) {
        express_app.get("/__test/server-logs", (_req_1, res_1) => {
            try {
                const { logs } = getServerSocketContext();
                res_1.json({ logs });
            } catch (err_1) {
                const message_2 = err_1 instanceof Error ? err_1.message : "Unknown error";
                res_1.status(500).json({ error: message_2 });
            }
        });
    }

    /**
     * Handle all other requests, used for serving the app.
     */
    express_app.all(
        "/{*any}",
        (req_1: express.Request, res_2: express.Response) => app.getRequestHandler()(req_1, res_2)
    );

    server.listen(port, () => {
        console.log(`server running at http://localhost:${port}`);
    });
}

