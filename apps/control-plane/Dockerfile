FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile && pnpm exec prisma generate && pnpm --filter @gatekeeper/shared build && pnpm --filter @gatekeeper/control-plane build
EXPOSE 8081
CMD ["sh","-c","pnpm exec prisma migrate deploy && pnpm --filter @gatekeeper/control-plane dev"]
