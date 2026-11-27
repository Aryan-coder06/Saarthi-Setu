FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Next.js embeds NEXT_PUBLIC_* values in the browser bundle at build time.
ARG NEXT_PUBLIC_MATCH_URL=/api/match
ARG NEXT_PUBLIC_TRANSCRIBE_URL=/api/transcribe
ENV NEXT_PUBLIC_MATCH_URL=$NEXT_PUBLIC_MATCH_URL \
    NEXT_PUBLIC_TRANSCRIBE_URL=$NEXT_PUBLIC_TRANSCRIBE_URL

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
