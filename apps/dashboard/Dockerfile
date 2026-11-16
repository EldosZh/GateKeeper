FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile && pnpm --filter @gatekeeper/dashboard build
EXPOSE 3000
CMD ["pnpm","--filter","@gatekeeper/dashboard","dev"]
