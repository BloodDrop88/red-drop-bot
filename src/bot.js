import { Bot } from 'grammy';
import { env } from './config/env.js';
import { callBackend } from './backend.js';
import { replies } from './templates.js';

// The bot never decides anything: it forwards to the backend and shows the answer.
export function createBot() {
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

    // Linking and unlinking only make sense in a one-to-one chat with the bot.
    const privateChats = bot.chatType('private');

    // t.me/<bot>?start=<token> arrives as "/start <token>".
    privateChats.command('start', async (ctx) => {
        const token = typeof ctx.match === 'string' ? ctx.match.trim() : '';
        if (!token) return ctx.reply(replies.welcome());

        const { status, data } = await callBackend('/bot/link', {
            token,
            chatId: String(ctx.chat.id),
            username: ctx.from?.username ?? null,
        });
        console.log(`link chat=${ctx.chat.id} status=${status}`);
        if (status === 200) return ctx.reply(replies.linked(data));
        if (status === 410 || status === 400) return ctx.reply(replies.linkExpired());
        return ctx.reply(replies.backendDown());
    });

    bot.command('help', (ctx) => ctx.reply(replies.help()));

    privateChats.command('unlink', async (ctx) => {
        const { status, data } = await callBackend('/bot/unlink', { chatId: String(ctx.chat.id) });
        console.log(`unlink chat=${ctx.chat.id} status=${status}`);
        if (status !== 200) return ctx.reply(replies.backendDown());
        return ctx.reply(data.unlinked ? replies.unlinked() : replies.notLinked());
    });

    // Log the error but keep the bot running.
    bot.catch(({ error, ctx }) => {
        console.error(`Error handling update ${ctx.update.update_id}:`, error.message);
    });

    return bot;
}
