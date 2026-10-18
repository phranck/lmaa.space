# Rate Limit and Proxy Strategy

## Current State

- The default store is intentionally in-memory and is therefore not shared across instances.
- Production horizontal scaling requires replacing it with a shared backend.
- `rateLimit()` already accepts an injected `store` object for that purpose.

## Bucket Keys

- A key uses `{routePath}:{clientIp}`, which names the matched route rather than the requested path.
- `/shops/:identifier` is one bucket regardless of which slug or legacy token is requested. `/shops/id/:token` is a separate bucket for namespaced token requests.
- The path contains an identifier selected by the caller. Including it in the key would give every attempt its own bucket and prevent the limit from stopping the enumeration it protects against.
- Entries written with an older key format expire by themselves and require no migration.

## Internal Callers

- Requests carrying a valid `X-Internal-Token` bypass rate limiting.
- Server-side website rendering calls the backend directly rather than through the proxy. Those requests have no client address and would otherwise share one bucket, allowing a single visitor's limit to block rendering for the entire site.
- `INTERNAL_API_TOKEN` must contain the same value for the backend and website.
- When the variable is absent, no request bypasses the limit. A missing secret does not open access.
- The website sends the token only to the configured backend origin.

## Trusted Client IP

- The client IP is read only from one explicitly configured header.
- Configuration uses:
  - `TRUST_PROXY_IP_HEADER`
  - `TRUST_PROXY_HOPS`, when `x-forwarded-for` is used

## Deployment Rule

- Use `cf-connecting-ip` only when Cloudflare actually fronts the backend.
- Use `x-real-ip` or `x-forwarded-for` only when the upstream proxy reliably sets and replaces those headers.
- With `x-forwarded-for`, `TRUST_PROXY_HOPS` must match the real proxy chain so an untrusted hop cannot be interpreted as the client IP.
