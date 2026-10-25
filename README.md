# red-drop-bot

Telegram bot for Red Drop (`@RedDropKH_bot`). It never decides anything: it sends what the backend asks
and forwards what people tap back to the backend. See `red-drop-docs/red-drop-bot/docs/bot-guide.md`.

## What it does now
| Command | Behaviour |
|---|---|
| `/start <token>` | From the website's Connect Telegram link. Calls the backend's `POST /bot/link` and replies Connected or "link expired" |
| `/start` | Greets a connected user, or explains what the bot is and how to connect |
| `/help` | What the bot sends and how to stop alerts |
| `/unlink` | Calls `POST /bot/unlink` and disconnects this chat |

Every call to the backend carries `X-Bot-Secret`. Linking and unlinking only work in a private chat with the bot.

## Run
Needs Node 24.

```bash
npm install
cp .env.example .env   # then fill in TELEGRAM_BOT_TOKEN and BOT_SHARED_SECRET
npm run dev            # long polling, restarts on file changes
npm test               # handlers against a fake Telegram and a fake backend
```

Only one copy of the bot can poll Telegram at a time. A second copy fails with a 409 conflict, so pause the hosted copy before running it locally.

## Hosting
Runs inside the backend's Render service as a fourth process: the backend's build downloads this repo and its
`scripts/start-all.js` starts the bot with `BACKEND_URL` pointing at the local gateway. `TELEGRAM_BOT_TOKEN`,
`WEB_APP_URL` and `BOT_SHARED_SECRET` are set on that Render service. Render does not watch this repo, so after pushing
here, redeploy the backend service on Render. The `Dockerfile` is for a container host later; Render does not use it.

## Layout
```
src/
  config/env.js   environment, checked with zod
  bot.js          command handlers
  backend.js      calls to the backend with X-Bot-Secret
  templates.js    every message text
  server.js       HTTP server (health check)
  outbox.js       collects queued messages from the backend, sends them, reports results
  index.js        starts the HTTP server and long polling
tests/unit/       handler tests
```
