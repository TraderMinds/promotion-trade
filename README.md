# Promotion Trade Telegram Mini App

A Cloudflare Worker + Telegram Mini App demo that simulates AI-guided short-term trades on mock crypto data. This project now includes a more robust backend structure with typed domain models, consistent JSON envelopes, request correlation IDs, and input validation.

> Educational / demo only. Not financial advice.

---
## Current Architecture

| Component | File | Purpose |
|-----------|------|---------|
| Worker Entrypoint | `src/worker.ts` | Routing, orchestrates handlers, serves mini-app HTML & client script. |
| Telegram Handler | `src/telegram.ts` | Processes bot webhook updates & replies. |
| Trade Handler | `src/handlers/trade.ts` | Encapsulated `/api/trade` execution logic. |
| Users Data Module | `src/data/users.ts` | Centralized KV access for user persistence. |
| Metrics Module | `src/data/metrics.ts` | Lightweight KV counters for observability. |
| Domain Types | `src/types.ts` | Strong types for User, Trade records, Signals, API responses. |
| Utilities | `src/utils.ts` | JSON helpers, validation, request ID generation, safe JSON parsing. |
| Mini App HTML | `src/miniapp.ts` | Generates HTML shell with CSP referencing external JS. |
| Mini App Client JS | `src/miniappClient.ts` | Generates client script served at `/miniapp/app.js`. |
| KV Storage | Cloudflare KV (`TRADING_KV`) | Persists user profile JSON blobs. |

Recent additions: modular telegram + trade handlers, `/api/health`, Telegram init data verification, `/api/trade` server simulation (server-authoritative), externalized miniapp JS, basic IP + per-user rate limiting, structured logging helper, lightweight KV-backed metrics counters, centralized user persistence + ephemeral in-memory user cache.

---
## Implemented Endpoints

| Path | Method | Description | Response Envelope |
|------|--------|-------------|-------------------|
| `/webhook` | POST | Telegram bot update receiver (handled in `telegram.ts`) | Plain text / 200 or error |
| `/api/prices` | GET | Returns list of mock crypto prices | `{ success, data: Price[], requestId }` |
| `/api/user/register` | POST | Registers user (validated payload; optional Telegram init verification if header provided) | `{ success, data: { id, balance, firstName }, requestId }` |
| `/api/user/:id` | GET | Returns stored user | `{ success, data: User, requestId }` or error |
| `/api/health` | GET | Health info (uptime, KV reachability) | `{ success, data: { status, time, uptimeMs, kv }, requestId }` |
| `/api/trade` | POST | Server-side trade simulation (fields: userId, amount, symbol?, side?) | `{ success, data: { trade, ticks, newBalance }, requestId }` |
| `/miniapp` | GET | Serves HTML mini app | HTML |

### Trade Simulation (Modular Handler)
`POST /api/trade` body example:
```json
{ "userId": 12345, "amount": 5, "symbol": "BTC", "side": "BUY" }
```
Response excerpt:
```json
{
  "success": true,
  "data": {
    "trade": { "symbol": "BTC", "pnlPct": 1.23, "pnlUsd": 0.06, ... },
    "ticks": [101.2, 101.4, ...],
    "newBalance": 10.06
  },
  "requestId": "abc123"
}
```

### Telegram Init Verification
If the client supplies an `X-Telegram-Init` header containing the raw WebApp init data string, the server validates its HMAC signature before accepting registration. Failure returns `401` with code `UNAUTHORIZED`.

---
## JSON Response Format
All JSON API responses conform to one of:

Success:
```json
{ "success": true, "data": { /* payload */ }, "requestId": "abc123" }
```
Error:
```json
{ "success": false, "error": "Message", "code": "OPTIONAL_CODE", "requestId": "abc123" }
```
The `X-Request-Id` header mirrors `requestId` for tracing across logs.

---
## Validation
`/api/user/register` validates the incoming JSON:
- Required fields: `id`, `firstName`
- Auto-defaults: `balance` (10.0), `languageCode` ('en'), metrics fields
- Returns 422 with code `VALIDATION_ERROR` on bad input
- Rejects empty body / invalid JSON / large payloads (> 10KB)

---
## Setup
```bash
npm install
wrangler kv:namespace create TRADING_KV  # add id to wrangler.toml
wrangler secret put TELEGRAM_BOT_TOKEN
npm run dev
```
### Secrets
Provide required secrets (locally via `wrangler secret put` or GitHub Actions repo secrets):
- `TELEGRAM_BOT_TOKEN` (from BotFather)
- `BOT_TOKEN_SECRET` (optional separate secret if you want distinct signing key)
- `CF_API_TOKEN` (for CI deploy; needs Workers + KV write permissions)
- `CF_ACCOUNT_ID` (for CI deploy)

### Webhook Registration
After deploy (and setting real bot token):
```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://promotion-trade-bot.tradermindai.workers.dev/webhook"}'
```
Check current webhook:
```bash
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo
```
Set Telegram webhook (replace values):
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<your-subdomain>.workers.dev/webhook"}'
```

---
## Security & Hardening Status
| Area | Status | Notes |
|------|--------|-------|
| Telegram WebApp Auth | HMAC verification implemented (registration) | Extend to other state-changing endpoints next |
| Rate Limiting | Fixed window (60 req/min/IP) + per-user (30 req/min) + per-user trade (30/min) | Window-based; upgrade to token bucket / DO later |
| Per-User Limits | Implemented for register, get user, trade | Keys: `user:<id>`, `user:<id>:trade` |
| Trade Logic | Server authoritative `/api/trade` (modular handler) | Future: atomic ops via Durable Object |
| CSP | Inline JS removed (external script) | Still allows inline styles; consider hashing / removing |
| Data Model | Whole-user JSON blobs | Future normalization & partial writes |
| Observability | Structured log events JSON + latencyMs | Expand metrics, sampling later |

---
## Development Notes
- Uses ESM with `moduleResolution: NodeNext` so local imports need `.js` extension.
- KV keys: `user:<id>` storing the entire user JSON.
- Avoid large JSON bodies; enforced limit ~10KB in `parseJsonSafe`.

---
## Recently Completed
1. Extracted miniapp HTML & external client JS (`/miniapp/app.js`).
2. Added `/api/health` (uptime + KV reachability).
3. Implemented Telegram init data HMAC verification (registration path; optional trade enforcement via `REQUIRE_INIT_FOR_TRADE`).
4. Relocated trade simulation logic into dedicated handler (`src/handlers/trade.ts`).
5. Added structured JSON logging helper (`logEvent`) including latencyMs.
6. Implemented IP + per-user + per-user-trade rate limits with `X-RateLimit-*` headers.
7. Added lightweight KV metrics counters (`incrementCounter`) per route/feature.
8. Extracted Telegram webhook logic to `src/telegram.ts` (removed duplication from `worker.ts`).
9. Removed large legacy inline HTML & unused helper functions from `worker.ts` (lean router core).
10. Updated CSP to remove inline script dependence (external JS only).

---
## Future Enhancements
- Durable Object for atomic trade processing & locking
- Workers AI integration for real signal generation
- Leaderboard + pagination APIs
- Log enrichment (latencyMs, outcome) & sampling
- Unit / integration tests with Miniflare
- Per-user + adaptive (burst) rate limiting strategy
- CSP hardening: remove `unsafe-inline` for styles, consider nonce for dynamic injection

---
## Future Roadmap (Next-Step Enhancements)

| Category | Enhancement | Notes |
|----------|-------------|-------|
| Auth | Enforce Telegram init data on all state-changing endpoints | Cache validated user session token (JWT) |
| Rate Limiting | Per-IP + per-user quotas | KV token bucket or Durable Object |
| Trades | Deterministic seeding for reproducibility | Allow side-dependent drift tuning |
| Data | Durable Object migration | Atomic updates + streaming sessions |
| Observability | Structured JSON logs + latencyMs | Consider sampling, add error ratio metrics |
| Metrics | KV counters via `incrementCounter` | Potential move to Analytics Engine or DO |
| User Cache | 5s in-memory TTL (optional) | Speeds hot repeat reads within same isolate |
| Security | CSP hardening (remove unsafe-inline) | Externalize scripts & add nonce |
| Testing | Miniflare unit + integration tests | Mock KV + simulate webhook events |
| Frontend | Modular JS bundle | Build with esbuild / Vite for clarity |
| AI | Workers AI model integration | Add confidence score & rationale |
| UX | Live tick streaming | SSE endpoint `/api/stream/ticks` |
| Persistence | Trade history pagination | Store partial records in separate keys |

> Prioritize auth + rate limiting before exposing publicly.

---
## Limitations & Notes
- KV writes are last-write-wins; concurrent trade requests may race and overwrite balance updates. Use a Durable Object for atomic trade settlement in production.
- Rate limiter is a simple fixed-window; bursts at boundary changes may allow >60 requests in a 61s span. Token bucket or sliding window recommended later.
- Per-user limiter uses additional KV keys; ensure KV ops cost acceptable. Consider batching or adopting DO for combined state.
- Telegram init data currently validated only on registration; repeat usage on trade endpoints or adopt signed session tokens for broader protection.
- `REQUIRE_INIT_FOR_TRADE=true` (if set) forces verified Telegram init data on trade operations.
- CSP still allows inline styles (`'unsafe-inline'`); refine with hashed or class-based styles if threat model requires.
- Logging prints JSON via `logEvent`; integrate with aggregation pipeline for search/metrics.
- User cache is per-isolate ephemeral; no cross-pop consistency guarantee (stale up to 5s).
- No persistence schema migrations—user blobs may grow; consider pruning or splitting history.

---
## Disclaimer
Educational use only. No warranty. Not financial advice.

---
## License
MIT (add LICENSE file if distributing publicly).
