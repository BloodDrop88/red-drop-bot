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
        if (!token) {
            // A plain /start (or Telegram's Restart button): greet a connected user, otherwise explain how to connect.
            const { status, data } = await callBackend('/bot/status', { chatId: String(ctx.chat.id) });
            return ctx.reply(status === 200 && data.linked ? replies.alreadyLinked(data) : replies.welcome());
        }

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

    // "Yes, received" and "Not yet" under a confirm_prompt. Callback data is "<action>:<responseId>" (api.md).
    bot.callbackQuery(/^(recv_yes|recv_no):([0-9a-f-]{36})$/, async (ctx) => {
        const [, action, entityId] = ctx.match;
        const { status, data } = await callBackend('/bot/actions', {
            action,
            entityId,
            chatId: String(ctx.chat.id),
            messageId: ctx.callbackQuery.message?.message_id,
            telegramUserId: String(ctx.from.id),
        });
        console.log(`action ${action} chat=${ctx.chat.id} status=${status}`);
        const note = actionNote(status, data);
        // Always answer the tap, or the button keeps spinning (bot-guide.md).
        await ctx.answerCallbackQuery({ text: note });
        // Handled, by this tap or an earlier one: show the outcome under the question and remove the buttons.
        if (status === 200 || status === 409) {
            const question = ctx.callbackQuery.message?.text ?? '';
            await ctx.editMessageText(`${question}\n\n${note}`).catch(() => {});
        }
    });

    // Buttons from old messages, or anything this bot does not know.
    bot.on('callback_query:data', (ctx) => ctx.answerCallbackQuery({ text: replies.buttonExpired() }));

    // Log the error but keep the bot running.
    bot.catch(({ error, ctx }) => {
        console.error(`Error handling update ${ctx.update.update_id}:`, error.message);
    });

    return bot;
}

// What to tell the person who tapped, from the backend's answer.
function actionNote(status, data) {
    if (status === 200) return data.text;
    if (status === 409) {
        const handledBy = data?.error?.details?.handledBy;
        return handledBy ? replies.alreadyHandledBy({ name: handledBy }) : (data?.error?.message ?? replies.alreadyHandled());
    }
    if (status === 403) return replies.notAllowed();
    return replies.backendDown();
}
