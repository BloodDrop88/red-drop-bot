import { env } from './config/env.js';
import { createBot } from './bot.js';
import { createServer } from './server.js';
import { startOutbox } from './outbox.js';

const bot = createBot();
const server = createServer().listen(env.PORT, () => {
    console.log(`Red Drop bot HTTP server listening on http://localhost:${env.PORT}`);
});

// The command menu Telegram shows next to the message box.
await bot.api.setMyCommands([
    { command: 'help', description: 'What this bot sends' },
    { command: 'unlink', description: 'Stop alerts and disconnect this chat' },
]);

// Long polling: the bot asks Telegram for new messages, so it needs no public URL to receive them.
// Only one copy of the bot can poll at a time; a second one fails with a 409 conflict.
bot.start({
    drop_pending_updates: true,
    onStart: (info) => console.log(`Red Drop bot @${info.username} is polling for messages`),
});

// Messages the backend wants sent (alerts, rejections). Polling it also keeps the free backend awake.
const stopOutbox = startOutbox(bot.api);
console.log('Checking the backend outbox every 3 seconds');

async function shutdown() {
    stopOutbox();
    await bot.stop();
    server.close();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
