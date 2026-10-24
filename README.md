# red-drop-bot

Telegram bot for Red Drop (`@RedDropKH_bot`). It never decides anything: it sends what the backend asks
and forwards what people tap back to the backend. See `red-drop-docs/red-drop-bot/docs/bot-guide.md`.

## What it does now
| Command | Behaviour |
|---|---|
| `/start <token>` | From the website's Connect Telegram link. Calls the backend's `POST /bot/link` and replies Connected or "link expired" |
| `/start` | Explains what the bot is and how to connect |
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

Only one copy of the bot can poll Telegram at a time. A second copy fails with a 409 conflict.

## Layout
```
src/
  config/env.js   environment, checked with zod
  bot.js          command handlers
  backend.js      calls to the backend with X-Bot-Secret
  templates.js    every message text
  server.js       HTTP server (health check; /internal/send in the next phase)
  index.js        starts the HTTP server and long polling
tests/unit/       handler tests
```
