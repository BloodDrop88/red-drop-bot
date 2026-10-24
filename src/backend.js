import { env } from './config/env.js';

// Calls the backend's bot endpoints. Returns { status, data } and never throws for an HTTP error,
// so each handler decides what to tell the user. A network failure becomes status 0.
export async function callBackend(path, body) {
    try {
        const res = await fetch(`${env.BACKEND_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bot-Secret': env.BOT_SHARED_SECRET },
            body: JSON.stringify(body),
            // The free Render backend can take up to a minute to wake up.
            signal: AbortSignal.timeout(70_000),
        });
        const data = await res.json().catch(() => null);
        return { status: res.status, data };
    } catch (err) {
        console.error(`Backend call ${path} failed:`, err.message);
        return { status: 0, data: null };
    }
}
