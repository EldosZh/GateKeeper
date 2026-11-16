# Deployment

Development uses Docker Compose: `docker compose up --build`. Services communicate on a private bridge; dashboard/control plane bind to loopback and database/Redis are internal only. Configure `.env` first. Migrations run at control-plane startup via Prisma. Prometheus UI binds to loopback port 9090; metrics endpoint is at gateway `/metrics`.

For deployment, use TLS termination, secret manager integration, pinned image digests, resource limits, backup/restore for PostgreSQL, Redis persistence appropriate to your availability target, health probes, egress allowlists and a private control-plane network. A hardened reverse proxy, production image build, and rolling migration strategy remain operational follow-up work.
