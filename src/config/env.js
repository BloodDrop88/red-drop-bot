import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
    PORT: z.coerce.number().default(4100),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // From @BotFather. Never commit it.
    TELEGRAM_BOT_TOKEN: z.string().regex(/^\d+:[\w-]{30,}$/, 'Paste the token from @BotFather'),
    // The backend gateway, including /api/v1.
    BACKEND_URL: z.url(),
    // Same value as the backend core service's BOT_SHARED_SECRET.
    BOT_SHARED_SECRET: z.string().min(1),
    // The website, for buttons that open a request.
    WEB_APP_URL: z.url().default('http://localhost:5173'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
