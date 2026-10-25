import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Fake configuration, set before the bot code reads it.
process.env.TELEGRAM_BOT_TOKEN = '123456:TEST-token-for-unit-tests-only-abcdefgh';
process.env.BACKEND_URL = 'http://backend.test/api/v1';
process.env.BOT_SHARED_SECRET = 'test-secret';

const { createBot } = await import('../../src/bot.js');
const { replies } = await import('../../src/templates.js');

// Fake backend: answers by path. Records what the bot sent it.
let backendAnswers;
let backendCalls;
globalThis.fetch = async (url, options) => {
    const path = url.replace('http://backend.test/api/v1', '');
    backendCalls.push({ path, headers: options.headers, body: JSON.parse(options.body) });
    const answer = backendAnswers[path];
    if (!answer) throw new Error('network down');
    return new Response(JSON.stringify(answer.data), { status: answer.status });
};

// Fake Telegram: every API call the bot makes is captured instead of sent.
function makeBot() {
    const bot = createBot();
    bot.botInfo = { id: 1, is_bot: true, first_name: 'Red Drop', username: 'RedDropKH_bot' };
    const sent = [];
    bot.api.config.use(async (prev, method, payload) => {
        sent.push({ method, payload });
        return { ok: true, result: true };
    });
    return { bot, sent };
}

function message(text, chatType = 'private') {
    const entities = text.startsWith('/') ? [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] : [];
    return {
        update_id: 1,
        message: {
            message_id: 1,
            date: 0,
            text,
            entities,
            chat: { id: 4242, type: chatType },
            from: { id: 4242, is_bot: false, first_name: 'Sophea', username: 'sophea_c' },
        },
    };
}

const replyTexts = (sent) => sent.filter((c) => c.method === 'sendMessage').map((c) => c.payload.text);

beforeEach(() => {
    backendAnswers = {};
    backendCalls = [];
});

test('/start with a valid token links the chat', async () => {
    backendAnswers['/bot/link'] = { status: 200, data: { linked: true, firstName: 'Sophea' } };
    const { bot, sent } = makeBot();
    await bot.handleUpdate(message('/start abc123'));

    assert.deepEqual(backendCalls[0].body, { token: 'abc123', chatId: '4242', username: 'sophea_c' });
    assert.equal(backendCalls[0].headers['X-Bot-Secret'], 'test-secret');
    assert.deepEqual(replyTexts(sent), [replies.linked({ firstName: 'Sophea' })]);
});

test('/start with an expired token says so', async () => {
    backendAnswers['/bot/link'] = { status: 410, data: { error: { code: 'LINK_TOKEN_INVALID' } } };
    const { bot, sent } = makeBot();
    await bot.handleUpdate(message('/start old'));
    assert.deepEqual(replyTexts(sent), [replies.linkExpired()]);
});

test('/start when the backend is unreachable', async () => {
    const { bot, sent } = makeBot();
    await bot.handleUpdate(message('/start abc123'));
    assert.deepEqual(replyTexts(sent), [replies.backendDown()]);
});

test('plain /start explains how to connect when the chat is not linked', async () => {
    backendAnswers['/bot/status'] = { status: 200, data: { linked: false, firstName: null } };
    const { bot, sent } = makeBot();
    await bot.handleUpdate(message('/start'));
    assert.deepEqual(backendCalls[0].body, { chatId: '4242' });
    assert.deepEqual(replyTexts(sent), [replies.welcome()]);
});

test('plain /start greets a chat that is already linked', async () => {
    backendAnswers['/bot/status'] = { status: 200, data: { linked: true, firstName: 'Sophea' } };
    const { bot, sent } = makeBot();
    await bot.handleUpdate(message('/start'));
    assert.deepEqual(replyTexts(sent), [replies.alreadyLinked({ firstName: 'Sophea' })]);
});

test('plain /start still explains the bot when the backend is unreachable', async () => {
    const { bot, sent } = makeBot();
    await bot.handleUpdate(message('/start'));
    assert.deepEqual(replyTexts(sent), [replies.welcome()]);
});

test('/unlink reports whether the chat was connected', async () => {
    backendAnswers['/bot/unlink'] = { status: 200, data: { unlinked: true } };
    let { bot, sent } = makeBot();
    await bot.handleUpdate(message('/unlink'));
    assert.deepEqual(replyTexts(sent), [replies.unlinked()]);

    backendAnswers['/bot/unlink'] = { status: 200, data: { unlinked: false } };
    ({ bot, sent } = makeBot());
    await bot.handleUpdate(message('/unlink'));
    assert.deepEqual(replyTexts(sent), [replies.notLinked()]);
});

test('linking is ignored in group chats', async () => {
    const { bot, sent } = makeBot();
    await bot.handleUpdate(message('/start abc123', 'group'));
    assert.equal(backendCalls.length, 0);
    assert.equal(replyTexts(sent).length, 0);
});

test('/help works anywhere', async () => {
    const { bot, sent } = makeBot();
    await bot.handleUpdate(message('/help', 'group'));
    assert.deepEqual(replyTexts(sent), [replies.help()]);
});
