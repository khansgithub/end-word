import express from "express";
import type next from "next";
import { registry } from "@/server/metrics";
import { getLogs, log } from "@/server/logging";

/**
 * Handle metrics requests, used for monitoring the server + testing.
 */
function metricsRoute(app: express.Express) {
    app.get("/metrics", async (_req, res) => {
        try {
            res.set("Content-Type", registry.contentType);
            res.send(await registry.metrics());
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    });

}

/**
 * Handle endpoint for getting the server logs, used for testing.
 */
function logsRoute(app: express.Express, enableTestEndpoints: boolean) {
    if (enableTestEndpoints) {
        app.get("/__test/server-logs", (_req, res) => {
            try {
                const logs = getLogs();
                return res.json({ logs });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                log("[logsRoute] error:", message)();
                return res.status(500).json({ error: message });
            }
        });
    } else {
        log("enableTestEndpoints is disabled")();
    }
}

/**
 * Handle all other requests, used for serving the app.
 */
function nextAppRoute(app: express.Express, nextApp: ReturnType<typeof next>) {
    app.all(
        "/{*any}",
        (req: express.Request, res: express.Response) => nextApp.getRequestHandler()(req, res)
    );
}

export function setupRoutes(
    expressApp: express.Express,
    nextApp: ReturnType<typeof next>,
    enableTestEndpoints: boolean
): void {
    metricsRoute(expressApp);
    logsRoute(expressApp, enableTestEndpoints);
    nextAppRoute(expressApp, nextApp);
}
