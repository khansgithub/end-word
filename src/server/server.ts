import express from "express";
import next from "next";

import { createServer } from "node:http";
import { createIOServer, getServerSocketContext } from "./socket";
import { registry } from "./metrics";
import { buildInitialGameState } from "../shared/GameState";

const app = next({ dev: true, dir: "src" });
const express_app = express();
const server = createServer(express_app);

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
createIOServer(server);

const enableTestEndpoints = process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "1";

app.prepare().then(() => {
    express_app.use(express.json());

    express_app.get("/metrics", async (_req, res) => {
        try {
            res.set("Content-Type", registry.contentType);
            res.send(await registry.metrics());
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    });

    if (enableTestEndpoints) {
        express_app.get("/__test/server-logs", (_req, res) => {
            try {
                const { logs } = getServerSocketContext();
                res.json({ logs });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                res.status(500).json({ error: message });
            }
        });
    }

    express_app.all(
        "/{*any}",
        (req: express.Request, res: express.Response) => app.getRequestHandler()(req, res)
    );
    server.listen(port, () => {
        console.log(`server running at http://localhost:${port}`);
    });
});
