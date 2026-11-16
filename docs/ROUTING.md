# Routing

Routes match an optional host list, HTTP method list, and either exact path or path-segment prefix. Prefix `/v1` matches `/v1` and `/v1/items`, not `/v10`. The selected route has highest priority, then longest path, then lexically lowest ID for deterministic ties. Rewrites replace the matched prefix. Query strings are preserved.

The proxy strips standard hop-by-hop headers and sets forwarded request metadata. Current implementation buffers Fastify-parsed request bodies and serializes JSON, so streaming and transparent arbitrary content types are not complete. Redirects are not followed. Upstream timeout is configured per route.
