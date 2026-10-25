import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.TELEGRAM_BOT_TOKEN = '123456:TEST-token-for-unit-tests-only-abcdefgh';
process.env.BACKEND_URL = 'http://backend.test/api/v1';
process.env.BOT_SHARED_SECRET = 'test-secret';
process.env.WEB_APP_URL = 'https://reddrop.example';

const { GrammyError } = await import('grammy');
const { deliver } = await import('../../src/outbox.js');
const { renderNotification } = await import('../../src/templates.js');

// Fake backend that records each reported result.
let reports;
globalThis.fetch = async (url, options) => {
    reports.push({ path: url.replace('http://backend.test/api/v1', ''), body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
};

beforeEach(() => {
    reports = [];
});

const alert = {
    id: 'n1',
    chatId: '4242',
    template: 'request_alert',
    params: { requestId: 'r1', bloodType: 'O+', urgency: 'critical', units: 2, hospital: 'Calmette Hospital', distanceKm: 1.6 },
};

// A fake Telegram API whose sendMessage succeeds, or fails with the given Telegram error code.
function fakeApi(errorCode) {
    const sent = [];
    return {
        sent,
        sendMessage: async (chatId, text, extra) => {
            if (errorCode) {
                throw new GrammyError('call failed', { ok: false, error_code: errorCode, description: `Telegram ${errorCode}` }, 'sendMessage', {});
            }
            sent.push({ chatId, text, extra });
            return { message_id: 99 };
        },
    };
}

test('request_alert text follows bot-guide.md and links to the request', () => {
    const { text, button } = renderNotification(alert.template, alert.params, 'https://reddrop.example');
    assert.equal(text, 'Critical: O+ needed.\nCalmette Hospital, 1.6 km from you.\n2 units needed.');
    assert.deepEqual(button, { text: 'View request', url: 'https://reddrop.example/requests/r1' });
});

test('no button when the website is on localhost, because Telegram refuses those links', () => {
    assert.equal(renderNotification(alert.template, alert.params, 'http://localhost:5173').button, null);
});

test('a sent message is reported with its Telegram message id', async () => {
    const api = fakeApi();
    await deliver(api, alert);
    assert.equal(api.sent[0].chatId, '4242');
    assert.equal(api.sent[0].extra.reply_markup.inline_keyboard[0][0].url, 'https://reddrop.example/requests/r1');
    assert.deepEqual(reports, [{ path: '/bot/outbox/n1/result', body: { ok: true, messageId: 99 } }]);
});

test('a user who blocked the bot is reported as blocked, not retried', async () => {
    await deliver(fakeApi(403), alert);
    assert.equal(reports[0].body.blocked, true);
    assert.equal(reports[0].body.retry, false);
});

test('Telegram rate limiting is retried', async () => {
    await deliver(fakeApi(429), alert);
    assert.equal(reports[0].body.retry, true);
    assert.equal(reports[0].body.blocked, false);
});

test('an unknown template is reported as failed without calling Telegram', async () => {
    const api = fakeApi();
    await deliver(api, { ...alert, template: 'nope' });
    assert.equal(api.sent.length, 0);
    assert.deepEqual(reports[0].body, { ok: false, error: 'Unknown template nope', retry: false });
});

test('request_rejected includes the admin reason', () => {
    const { text } = renderNotification(
        'request_rejected',
        { requestId: 'r2', bloodType: 'A+', hospital: 'Preah Kossamak Hospital', reason: 'The document is not readable.' },
        'https://reddrop.example',
    );
    assert.match(text, /rejected: The document is not readable\./);
});
