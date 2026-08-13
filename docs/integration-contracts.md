# NexaReply integration contracts

NexaReply currently operates in a deterministic **Demo Mode**. It does not receive webhooks, connect to Meta, send Telegram messages, or call an external OpenAI account. This boundary is intentional: a demo must not look live or create accidental outbound effects.

| Capability | Demo behavior | Production enablement boundary |
|---|---|---|
| AI reply suggestion | Uses `shared/demo-ai.ts` and verified local catalog facts | Enable an explicit server-side provider key, then call `server/aiReplyAdapter.ts` through a protected organization-scoped procedure |
| Meta Messenger | Displays an unconfigured integration state | Store Meta credentials server-side, verify webhook signatures, acknowledge quickly, and enqueue processing durably |
| Owner notifications | Shows in-app Demo events | Configure an approved email or Telegram delivery adapter with idempotency keyed by conversation and event type |
| Debounce | Displays a configurable value and a shortened UI simulation | Reset a durable per-conversation timer for each inbound message; the worker must respect organization isolation and no-auto-send policies |

The `.env.example` file lists names only. Actual values must be supplied through the project’s managed secret configuration and must never be committed.

Managed secret names for a production rollout are `OPENAI_API_KEY`, `OPENAI_MODEL`, `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_PAGE_ACCESS_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`, `DATABASE_URL`, `S3_BUCKET`, `S3_REGION`, and `ENCRYPTION_KEY`. They are intentionally documented here rather than stored in a repository environment file.
