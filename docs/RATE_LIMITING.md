# Rate limiting

A Redis Lua script performs `INCR` and first-hit `EXPIRE` atomically. The fixed window uses a route and API-key digest (or client IP) key. It emits `X-RateLimit-Limit` and `X-RateLimit-Remaining`, and returns 429 beyond the configured count. Fixed windows are simple and fast, but can allow nearly twice the configured volume across adjacent window boundaries. Protected routes fail closed if Redis is unavailable; public routes currently proceed when Redis is unavailable. Global and explicit consumer scopes are future work.
