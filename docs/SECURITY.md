# Security

Control API and dashboard are localhost-bound by default; PostgreSQL and Redis have no host port. Gateway listens on all interfaces. Require strong secrets and a restricted deployment network. The internal gateway/control credential is a shared bearer secret.

Known gaps: localStorage admin token, no CSRF/session rotation, incomplete upstream SSRF defenses, no comprehensive RBAC resource scopes, no consumer JWT/JWKS, no response cache isolation, no egress proxy, and no dependency lockfile currently committed. Do not expose this initial version as a production internet-facing control plane. Set Docker resource limits and egress rules in deployment.
