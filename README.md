# Promotion Trade Telegram Mini App (Demo)

A Cloudflare Worker + Telegram Mini App demo that simulates AI-guided short-term trades (20 ticks / ~20 seconds) on a mock symbol `XUA/USD`. Users can:

- Open the mini app via a Telegram bot `/start` command.
- View current mock price & AI BUY/SELL signal.
- Deposit demo funds (virtual USD) to their balance.
- Execute a simulated 20-tick AI trade; profit (usually positive in demo) is added to balance.
- See last trade result & tick data sequence.
- All data persisted in Cloudflare KV (per user id).

> This is **demo / educational** code. Do NOT use for real trading or imply guaranteed profits. AI logic is intentionally simplistic & biased for wins.

---
## Architecture

| Component | Description |
|-----------|-------------|
| Cloudflare Worker (`src/worker.ts`) | Serves Telegram webhook, REST API endpoints, and static Mini App assets. |
| Pricing & AI mock (`src/logic/pricing.ts`) | Deterministic pseudo-random tick simulator + simple directional signal. |
| Storage (`src/logic/storage.ts`) | User state & trades with KV namespace `TRADING_KV`. |
| Mini App Frontend | Simple HTML/JS served under `/miniapp` using Telegram WebApp API. |

---
## Endpoints

| Path | Method | Purpose |
|------|--------|---------|
| `/webhook` | POST | Telegram bot update receiver. |
| `/api/state?user=ID` | GET | Current user state (balance, trades). |
| `/api/price?user=ID` | GET | Latest mock price & AI signal. |
| `/api/deposit?user=ID` | POST JSON {amount} | Add virtual funds. |
| `/api/trade?user=ID` | POST JSON {amount} | Run 20-tick trade simulation. |
| `/miniapp` | GET | Mini App HTML. |
| `/miniapp/app.js` | GET | Mini App JS bundle. |

---
## Prerequisites

- Cloudflare account + Wrangler CLI.
- Created Telegram bot via BotFather (token). 
- (Optional) Your own domain or use Workers default subdomain.

---
## Setup Steps

1. Install dependencies:

```bash
npm install
```

2. Create a KV namespace (replace name as desired):

```bash
wrangler kv:namespace create TRADING_KV
```
Copy the returned id into `wrangler.toml` replacing `__REPLACE_WITH_YOUR_KV_ID__`.

3. Add your Telegram bot token as a secret:

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
```

4. (Optional) Adjust `BASE_URL` & `MINIAPP_URL` in `wrangler.toml` to match your deployment URL.

5. Run locally (mock mode if no real token):

```bash
npm run dev
```

6. Set Telegram webhook (replace placeholders):

```bash
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-worker-subdomain.workers.dev/webhook"}'
```

7. In Telegram, open your bot and send `/start`.

---
## Mini App Notes

- For demo a static `userId = 12345` is used in `app.js`. In production you would:
  - Validate the Telegram init data (hash verification) sent by WebApp.
  - Extract real user id and sign requests or exchange for a session token.
- Price data and signal are mock & biased upward to show profitable outcomes.

---
## Security / Production Considerations

| Area | Demo State | Production Recommendation |
|------|------------|---------------------------|
| Auth | Hardcoded user id | Verify Telegram init data & map to user. |
| Data Integrity | No signature on API calls | Use JWT/session token & rate limits. |
| AI Logic | Simple heuristic | Real model or market microstructure logic. |
| Pricing | Pseudo-random + upward drift | Use real market data (ensure licensing). |
| Risk | Guaranteed-ish wins | Implement realistic PnL with losses possible. |
| Payments | Virtual balances | Integrate real payments (Stripe/crypto) carefully. |

---
## Extending

Ideas:
- Replace simulator with real-time price feed via Durable Object broadcasting.
- Add websocket (or SSE) streaming for ticks instead of polling.
- Implement user authentication & Telegram init data verification.
- Real AI microservice using Workers AI / external inference.
- Leaderboard of cumulative PnL.
- Trade history pagination & chart visualization (sparklines).

---
## Disclaimer

This repository is a **mock educational demo**. No warranty. Not financial advice. Use at your own risk.

---
## License

MIT (add LICENSE file if distributing publicly).

---
## Next Steps / Roadmap

Planned or suggested future improvements:

1. Telegram Auth: Parse and verify WebApp init data (hash) to bind real user IDs instead of static demo id.
2. Real-Time Updates: Replace polling with Durable Object broadcasting or WebSockets (when supported) / SSE.
3. Pricing Engine: Integrate real feed (e.g., cryptocompare or internal oracle) with caching and rate limiting.
4. AI Module: Call Workers AI or external inference endpoint; include model confidence and rationale.
5. Risk Controls: Max position size, cooldown between trades, stop-loss / take-profit simulation.
6. Persistence: Migrate from KV to Durable Object for atomic updates & streaming trade history windows.
7. Payments: Add Stripe or crypto deposit flow; maintain separation of real balances vs simulated PnL.
8. Analytics: Leaderboards, daily PnL charts, user retention metrics (privacy conscious).
9. Observability: Add logs, metrics counters (success/failure), request tracing headers.
10. Testing: Unit tests for pricing & storage logic plus integration tests against a local Miniflare environment.

Feel free to iterate according to your production priorities.
