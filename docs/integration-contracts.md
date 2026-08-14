# NexaReply integration contracts

NexaReply currently operates in a deterministic **Demo Mode**. It does not receive webhooks, connect to Meta, send Telegram messages, or call an external OpenAI account. This boundary is intentional: a demo must not look live or create accidental outbound effects.

| Capability | Demo behavior | Production enablement boundary |
|---|---|---|
| AI reply suggestion | Uses `shared/demo-ai.ts` and verified local catalog facts | Enable an explicit server-side provider key, then call `server/aiReplyAdapter.ts` through a protected organization-scoped procedure |
| Meta Messenger | Displays an unconfigured state and never receives Demo webhooks | The protected owner-only adapter uses managed credentials, OAuth Page selection, encrypted token custody, webhook challenge/HMAC validation, provider-event idempotency, and server-side delivery. See [`META_SETUP.md`](../META_SETUP.md). |
| Organization invitations | Owner can create a manual one-time invite link | Optional Resend delivery activates only with managed `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `INVITATION_BASE_URL`; token hashes only are persisted. See [`INVITATIONS_SETUP.md`](../INVITATIONS_SETUP.md). |
| Owner notifications | Shows in-app Demo events | Configure an approved email or Telegram delivery adapter with idempotency keyed by conversation and event type |
| Debounce | Displays a configurable value and a shortened UI simulation | Reset a durable per-conversation timer for each inbound message; the worker must respect organization isolation and no-auto-send policies |

The `.env.example` file lists names only. Actual values must be supplied through the project’s managed secret configuration and must never be committed.

Managed secret names for a production rollout are `OPENAI_API_KEY`, `OPENAI_MODEL`, `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_PAGE_ACCESS_TOKEN`, `META_OAUTH_REDIRECT_URI`, `META_GRAPH_API_VERSION`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `INVITATION_BASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`, `DATABASE_URL`, `S3_BUCKET`, `S3_REGION`, and `ENCRYPTION_KEY`. OAuth supports owner-scoped Page discovery and selection only; Page tokens are never persisted and remain exclusively in managed `META_PAGE_ACCESS_TOKEN`. Invitation token hashes only are persisted; Resend credentials remain server-only. These names are documented here rather than stored in a repository environment file.
