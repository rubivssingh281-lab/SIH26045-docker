# IP-SAKTI Sahayak — frontend (Next.js 15). Runs in dev mode for reliable parity.
FROM node:20-alpine

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# Bind to 0.0.0.0 so the dev server is reachable from the host.
CMD ["npx", "next", "dev", "-H", "0.0.0.0", "-p", "3000"]
