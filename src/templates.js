// Every message the bot sends lives here (bot-guide.md). Keep texts short and plain, no medical claims.

export const replies = {
    linked: ({ firstName }) =>
        `Connected, ${firstName}. You will get Red Drop alerts here when someone nearby needs your blood type.`,
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
