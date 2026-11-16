FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile && pnpm --filter @gatekeeper/shared build && pnpm --filter @gatekeeper/gateway build
EXPOSE 8080
CMD ["pnpm","--filter","@gatekeeper/gateway","dev"]
