FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libexpat1 libx11-6 \
    libx11-xcb1 libxext6 libxcb1 libxcursor1 libxrender1 libxi6 libxtst6 \
    libxss1 libdbus-1-3 libfontconfig1 ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN npx playwright install --with-deps
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libexpat1 libx11-6 \
    libx11-xcb1 libxext6 libxcb1 libxcursor1 libxrender1 libxi6 libxtst6 \
    libxss1 libdbus-1-3 libfontconfig1 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

EXPOSE 3000
CMD ["npm","start"]
