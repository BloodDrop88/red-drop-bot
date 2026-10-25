# Image for hosting the bot (Northflank builds this from the repo).
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies first so this layer is cached between code changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY src ./src

# Health check port only; the bot needs no incoming traffic (long polling and the backend outbox are outgoing).
ENV PORT=4100
EXPOSE 4100

# Run as the image's unprivileged user, not root.
USER node
CMD ["node", "src/index.js"]
