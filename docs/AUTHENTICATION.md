# Authentication

Admin bootstrap is available only while no admin exists and requires the configured `ADMIN_PASSWORD` as its bootstrap secret. Passwords are Argon2id hashed. Login returns a signed HS256 bearer token (8h). Admin roles are `ADMIN`, `OPERATOR`, and `VIEWER`; mutating requests require Admin or Operator. Production should use secure HTTP-only session cookies, rotation, CSRF protections, and external secret management; those are outstanding.

API keys are generated from cryptographic random bytes, returned only at creation, and stored as SHA-256 digests with prefix, consumer, expiration and revocation fields. Protected route verification is online with the control plane. Consumer JWT/JWKS route policies are not implemented yet.
