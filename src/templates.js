// Every message the bot sends lives here (bot-guide.md). Keep texts short and plain, no medical claims.

export const replies = {
    linked: ({ firstName }) =>
        `Connected, ${firstName}. You will get Red Drop alerts here when someone nearby needs your blood type.`,
    alreadyLinked: ({ firstName }) =>
        `You are connected, ${firstName}. Urgent requests near you that match your blood type will arrive here.\n\n` +
        'Send /help to see what I send, or /unlink to stop alerts.',
    linkExpired: () => 'This link has expired. Open Red Drop and tap Connect Telegram again.',
    backendDown: () => 'Red Drop is not reachable right now. Try again in a minute.',
    welcome: () =>
        'This is the Red Drop bot. It sends urgent blood request alerts and asks hospitals to confirm donations.\n\n' +
        'To connect your account, open Red Drop, go to your profile and tap Connect Telegram.',
    help: () =>
        'Red Drop sends you:\n' +
        '- urgent requests near you that match your blood type\n' +
        '- updates on requests you responded to\n\n' +
        'To stop alerts, send /unlink or turn off Available to donate in Red Drop.',
    unlinked: () => 'Disconnected. You will not get Red Drop alerts here any more.',
    notLinked: () => 'This chat is not connected to a Red Drop account.',
};

// Messages the backend queues in its outbox (api.md, Templates). Each returns the text and an optional link button
// into the website. Placeholders come from the notification's params.
const URGENCY_LABEL = { critical: 'Critical', urgent: 'Urgent', normal: 'Blood needed' };

const notifications = {
    request_alert: (p) => ({
        text:
            `${URGENCY_LABEL[p.urgency] ?? 'Blood needed'}: ${p.bloodType} needed.\n` +
            `${p.hospital}, ${p.distanceKm} km from you.\n` +
            `${p.units} unit${p.units === 1 ? '' : 's'} needed.`,
        link: { text: 'View request', path: `/requests/${p.requestId}` },
    }),
    request_rejected: (p) => ({
        text:
            `Your request for ${p.bloodType} at ${p.hospital} was rejected: ${p.reason}\n\n` +
            'You can send a new request with a clearer document.',
        link: { text: 'Open request', path: `/requests/${p.requestId}` },
    }),
};

// Telegram refuses buttons that point at localhost, so a local website gets no button.
function isPublicUrl(url) {
    const { hostname } = new URL(url);
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
}

// Returns { text, button } for a queued notification, or null for a template this bot does not know.
export function renderNotification(template, params, webAppUrl) {
    const render = notifications[template];
    if (!render) return null;
    const { text, link } = render(params);
    const button = link && isPublicUrl(webAppUrl) ? { text: link.text, url: new URL(link.path, webAppUrl).href } : null;
    return { text, button };
}
