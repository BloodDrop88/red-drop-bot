import { GrammyError, InlineKeyboard } from 'grammy';
import { env } from './config/env.js';
import { callBackend } from './backend.js';
import { renderNotification } from './templates.js';

// Every few seconds, ask the backend for queued messages, send them and report each result.
// The backend keeps the queue, so nothing is lost while the bot is offline, and nothing needs a public URL.
// Telegram allows about 30 messages a second overall; one batch of 10 every 3 seconds stays far below that.
export function startOutbox(api, { intervalMs = 3000, batchSize = 10 } = {}) {
    let busy = false;

    async function tick() {
        if (busy) return;
        busy = true;
        try {
            const { status, data } = await callBackend('/bot/outbox/claim', { limit: batchSize });
            if (status !== 200) return;
            for (const notification of data) await deliver(api, notification);
        } finally {
            busy = false;
        }
    }

    const timer = setInterval(tick, intervalMs);
    tick();
    return () => clearInterval(timer);
}

export async function deliver(api, notification) {
    const { id, chatId, template, params } = notification;
    const message = renderNotification(template, params, env.WEB_APP_URL);
    if (!message) {
        return report(id, { ok: false, error: `Unknown template ${template}`, retry: false });
    }

    const extra = message.button ? { reply_markup: new InlineKeyboard().url(message.button.text, message.button.url) } : {};
    try {
        const sent = await api.sendMessage(chatId, message.text, extra);
        console.log(`sent ${template} notification=${id}`);
        return report(id, { ok: true, messageId: sent.message_id });
    } catch (err) {
        const code = err instanceof GrammyError ? err.error_code : null;
        console.error(`failed ${template} notification=${id} code=${code ?? 'network'}`);
        return report(id, {
            ok: false,
            error: (err instanceof GrammyError ? err.description : err.message).slice(0, 500),
            // 403: the user blocked the bot. Network errors, 429 (too fast) and 5xx are worth retrying.
            blocked: code === 403,
            retry: code === null || code === 429 || code >= 500,
        });
    }
}

async function report(id, result) {
    const { status } = await callBackend(`/bot/outbox/${id}/result`, result);
    if (status !== 200) console.error(`could not report result for notification=${id} status=${status}`);
}
