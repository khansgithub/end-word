import express from 'express';
import next from 'next';

import { createServer } from 'node:http';
import { createIOServer } from './socket';

const app = next({ dev: true, dir: "src" });
const express_app = express();
const server = createServer(express_app);

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
createIOServer(server);

app.prepare().then(() => {
    express_app.use(express.json());
    express_app.all(
        '/{*any}',
        (req: express.Request, res: express.Response) => app.getRequestHandler()(req, res)
    );
    server.listen(port, () => {
        console.log(`server running at http://localhost:${port}`);
    });
});