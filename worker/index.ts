import { createServer } from 'node:http';
import '@epapers/server/jobs/index';

const server = createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/health') {
        response.writeHead(404).end();
        return;
    }

    response.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}');
});

server.listen(8080, '0.0.0.0');
