import express, { Request, Response } from 'express';
import next from 'next';
import http from 'http';
import { createIOServer } from "@/src/server/ws"

const app = next({
    dev: true,
    customServer: true,
    dir: "src"  
});
const handle = app.getRequestHandler();
const express_app = express();
const server = new http.Server(express_app);
const PORT = process.env.PORT || 4000;

app.prepare().then(() => {
    express_app.use(express.json());
    express_app.all('/{*any}', (req: express.Request, res: express.Response) => handle(req, res));
    createIOServer(server);
    server.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
});