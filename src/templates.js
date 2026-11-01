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
    alreadyHandledBy: ({ name }) => `Already confirmed by ${name}.`,
    walkInHandledBy: ({ name }) => `Already handled by ${name}.`,
    alreadyHandled: () => 'This was already handled.',
    notAllowed: () => 'You are not allowed to do this.',
    buttonExpired: () => 'This button is no longer active.',
};

// Messages the backend queues in its outbox (api.md, Templates). Placeholders come from the notification's params.
// Each returns the text and its buttons: `link` opens a page of the website, `url` opens any page,
// and `callbackData` is a tap the bot forwards to the backend (POST /bot/actions).
const WALK_IN_OUTCOME_LABEL = { donated: 'donated', ineligible: 'not eligible today', noshow: 'did not come' };
const URGENCY_LABEL = { critical: 'Critical', urgent: 'Urgent', normal: 'Blood needed' };

const CLOSED_REASON = {
    cancelled: 'was cancelled',
    expired: 'has expired',
    fulfilled: 'now has all the blood it needs',
};

function directionsUrl({ lat, lng }) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

const notifications = {
    request_alert: (p) => ({
        text:
            `${URGENCY_LABEL[p.urgency] ?? 'Blood needed'}: ${p.bloodType} needed.\n` +
            `${p.hospital}, ${p.distanceKm} km from you.\n` +
            `${p.units} unit${p.units === 1 ? '' : 's'} needed.`,
        buttons: [[{ text: 'View request', link: `/requests/${p.requestId}` }]],
    }),
    request_rejected: (p) => ({
        text:
            `Your request for ${p.bloodType} at ${p.hospital} was rejected: ${p.reason}\n\n` +
            'You can send a new request with a clearer document.',
        buttons: [[{ text: 'Open request', link: `/requests/${p.requestId}` }]],
    }),
    donor_coming: (p) => ({
        text: `${p.donorFirstName} (${p.bloodType}) is on the way to ${p.hospital} to donate for your request.`,
        buttons: [[{ text: 'Open request', link: `/requests/${p.requestId}` }]],
    }),
    arrival_details: (p) => ({
        text:
            `Thank you for responding. Please go to ${p.hospital}, ${p.address}.\n` +
            (p.phone ? `Hospital phone: ${p.phone}.\n` : '') +
            'Bring your ID.',
        buttons: [
            [{ text: 'Get directions', url: directionsUrl(p) }],
            [{ text: 'Open request', link: `/requests/${p.requestId}` }],
        ],
    }),
    confirm_prompt: (p) => ({
        text: `Did you receive the blood from ${p.donorFirstName} at ${p.hospital}?`,
        buttons: [
            [
                { text: 'Yes, received', callbackData: `recv_yes:${p.responseId}` },
                { text: 'Not yet', callbackData: `recv_no:${p.responseId}` },
            ],
        ],
    }),
    thank_you: (p) => ({
        text: `Thank you, ${p.firstName}. Your donation at ${p.hospital} was confirmed today. You can donate again in 56 days.`,
        buttons: [],
    }),
    request_expired: (p) => ({
        text:
            `Your request for ${p.bloodType} at ${p.hospital} has expired and is closed. ` +
            'If you still need blood, send a new request.',
        buttons: [[{ text: 'Open request', link: `/requests/${p.requestId}` }]],
    }),
    walkin_staff: (p) => ({
        text: `Walk-in donor at the desk: ${p.donorName}, ${p.bloodType}, at ${p.bloodBank}. Please confirm the outcome.`,
        buttons: [
            [{ text: 'Donated', callbackData: `walkin_donated:${p.walkInId}` }],
            [{ text: 'Not eligible today', callbackData: `walkin_ineligible:${p.walkInId}` }],
            [{ text: 'Did not come', callbackData: `walkin_noshow:${p.walkInId}` }],
        ],
    }),
    walkin_staff_handled: (p) => ({
        text:
            p.outcome === 'expired'
                ? `Walk-in donor ${p.donorName}: nobody confirmed the outcome in time, so nothing was counted.`
                : `Walk-in donor ${p.donorName}: ${WALK_IN_OUTCOME_LABEL[p.outcome]}. Handled by ${p.staffName}.`,
        buttons: [],
    }),
    walkin_ineligible_donor: (p) => ({
        text: `Staff at ${p.bloodBank} marked you as not eligible today, so nothing was counted. You can ask them why at the desk.`,
        buttons: [],
    }),
    join_request: (p) => ({
        text: `${p.applicantFirstName} (${p.title}) asked to join ${p.organization}. Please review the request.`,
        buttons: [[{ text: 'Review request', link: '/profile/organization' }]],
    }),
    join_decided: (p) => ({
        text: p.approved
            ? `You are now a member of ${p.organization}. Requests you post go to donors right away.`
            : `Your request to join ${p.organization} was declined.`,
        buttons: [[{ text: 'Open Red Drop', link: '/profile' }]],
    }),
    org_registered: (p) => ({
        text: `${p.organization} registered on Red Drop and is waiting to be verified.`,
        buttons: [[{ text: 'Review organization', link: '/admin/orgs' }]],
    }),
    org_decided: (p) => ({
        text: p.approved
            ? `${p.organization} is verified. You are its admin, and requests you post go to donors right away.`
            : `The registration of ${p.organization} was declined: ${p.reason} You can register again with a clearer document.`,
        buttons: [[{ text: 'Open Red Drop', link: '/profile' }]],
    }),
    stale_admin: (p) => ({
        text:
            `The ${p.bloodType} request at ${p.hospital} has a donor on the way, but nobody has answered ` +
            '"Did you receive the blood?" for 24 hours. Confirm the waiting donations or close the request.',
        buttons: [[{ text: 'Open in Red Drop', link: `/requests/${p.requestId}` }]],
    }),
    request_closed: (p) => ({
        text:
            `Update: the request at ${p.hospital} ${CLOSED_REASON[p.reason] ?? 'is closed'}. ` +
            'There is no need to go. Thank you for responding.',
        buttons: [],
    }),
};

// Telegram refuses buttons that point at localhost, so a local website gets no website buttons.
function isPublicUrl(url) {
    const { hostname } = new URL(url);
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
}

// Returns { text, buttons } for a queued notification, or null for a template this bot does not know.
// `buttons` is rows of { text, url } or { text, callbackData }, ready for an inline keyboard.
export function renderNotification(template, params, webAppUrl) {
    const render = notifications[template];
    if (!render) return null;
    const { text, buttons } = render(params);
    const rows = buttons
        .map((row) =>
            row.flatMap((button) => {
                if (!button.link) return [button];
                return isPublicUrl(webAppUrl) ? [{ text: button.text, url: new URL(button.link, webAppUrl).href }] : [];
            }),
        )
        .filter((row) => row.length > 0);
    return { text, buttons: rows };
}
