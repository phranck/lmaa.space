# Rate Limit / Proxy Strategy

## Aktueller Stand

- Default-Store ist bewusst nur In-Memory und damit **nicht instanzübergreifend**.
- Für produktive Horizontal-Skalierung muss der Store durch ein Shared Backend ersetzt werden.
- `rateLimit()` akzeptiert dafür bereits ein injizierbares `store`-Objekt.

## Vertrauenswürdige Client-IP

- Die Client-IP wird nur aus **einem explizit konfigurierten Header** gelesen.
- Konfiguration erfolgt über:
  - `TRUST_PROXY_IP_HEADER`
  - `TRUST_PROXY_HOPS` (relevant für `x-forwarded-for`)

## Deployment-Regel

- `cf-connecting-ip` nur verwenden, wenn Cloudflare tatsächlich vor dem Backend sitzt.
- `x-real-ip` oder `x-forwarded-for` nur verwenden, wenn der vorgeschaltete Proxy diese Header zuverlässig setzt und überschreibt.
- Bei `x-forwarded-for` muss `TRUST_PROXY_HOPS` der realen Proxy-Kette entsprechen, damit nicht ein untrusted Hop als Client-IP übernommen wird.
