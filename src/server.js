import express from 'express';

// HTTP side of the bot: a health check. Messages come from the backend outbox (outbox.js), not over HTTP.
export function createServer() {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '50kb' }));

    app.get('/health', (req, res) => {
        res.json({ status: 'ok', service: 'bot' });
    });

    app.use((req, res) => {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
    });

    return app;
}
