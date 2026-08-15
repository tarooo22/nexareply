# Phase 0 Audit — Existing Meta Messenger Onboarding

**Date:** 2026-08-15  
**Scope:** Read-only audit before the one-click onboarding hardening work. No Meta credential, Meta Dashboard setting, Page token, webhook subscription, database record, or outbound message was changed.

## Baseline validation

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed. |
| `pnpm check` | Passed. |
| `pnpm test -- --run` | 94 passed; 2 managed-secret integration tests intentionally skipped. |
| `pnpm build` | Passed. Existing bundle-size advisory remains. |

## Existing protections preserved

| Area | Existing implementation evidence |
| --- | --- |
| OAuth session | Random opaque session ID and random state; only SHA-256 state hash is persisted; 10-minute expiry; owner/org session lookups. |
| Authorization-code exchange | Callback exchanges code server-side; provider tokens are not returned to the client. |
| Tenant isolation | Every OAuth, staged-token, vault, connection, webhook and send operation resolves an owner/workspace scope server-side. |
| Token vault | AES-256-GCM authenticated encryption with 12-byte IV and 16-byte tag; tenant Page token is opened only for server Graph requests. |
| Page subscription | Page is persisted as connected only after `POST /{page-id}/subscribed_apps` succeeds. |
| Webhook security | GET challenge verification; raw-body `X-Hub-Signature-256` HMAC validation; 1 MB body limit; Page ID resolves organization server-side; idempotent event storage. |
| Outbound safety | Tenant-vault token is used for self-service connections; legacy managed Page token is a separate pilot fallback; outbound rate limit and delivery failure status exist. |

## Current implementation inventory

| File | Finding |
| --- | --- |
| `server/metaMessengerService.ts` | Generic OAuth URL requests five scopes; code exchange, direct `/me/accounts`, optional Business Login System User fallback, staged encrypted Page tokens, subscription, inbound verification, and Messenger send are implemented. |
| `server/metaMessengerRoutes.ts` | Contains callback and Messenger webhook routes only; no Meta signed-request data-deletion callback or deauthorization route. |
| `server/metaTokenVault.ts` | Correct AES-256-GCM envelope implementation and 32-byte managed-key validation. |
| `server/nexareplyRepository.ts` / `server/nexareplyRouter.ts` | Existing owner-scoped connection/session/vault methods and owner-only mutations; no disconnect/reconnect server procedure. |
| `client/src/components/MetaConnectionWizard.tsx` | Secure primary OAuth path exists, but manual Page ID/token entry is an equal-weight user-facing option; Page ID is shown in normal picker/connected UI; one returned Page still needs another click; no connection-management/disconnect state. |
| `META_SETUP.md` | Documents legacy global `META_PAGE_ACCESS_TOKEN` as if used for OAuth subscription; this is stale relative to current tenant-vault OAuth implementation and needs reconciliation. |
| `drizzle/schema.ts` | Meta connection/session/vault/staged-token/webhook tables are present; no callback/deauthorization lifecycle record is present. |
| Current tests | Cover OAuth session, token vault, webhook signature/idempotency and secret boundary; do not yet cover config ID, manual-flow production gating, single Page auto-selection, disconnect, signed Meta deletion callback, or connection lifecycle transitions. |

## Official-requirement gaps to address safely

1. Add managed `META_LOGIN_CONFIG_ID` support for an owner-created Facebook Login for Business configuration, preserving safe fallback behavior until the value is configured.
2. Do not remove `business_management` while the System User fallback remains. The permission audit documents that the fallback's `/{client_business_id}/system_user_access_tokens` endpoint requires it.
3. Gate manual Page ID/token setup behind a server-controlled `ENABLE_META_MANUAL_SETUP` feature flag that defaults to disabled; it must not be CSS-only hiding.
4. Auto-select a single returned Page only when a usable staged credential exists; retain compact picker for multiple candidates.
5. Add server-side disconnect/reconnect lifecycle that disables connection, deletes the tenant vault credential, prevents later sends, and preserves historical conversations.
6. Implement Meta's documented signed data-deletion request callback separately from the human-facing `/data-deletion` instructions route. It must validate `signed_request`, create an auditable request with a confirmation code, and return Meta's required JSON response.
7. Update setup/review documentation and tests, but do not claim live external-account capability before Meta Business Verification, any Access Verification, Advanced Access/App Review and non-admin acceptance testing succeed.

## References

See [Official Meta research](./meta_onboarding_official_research_2026-08-15.md) and [permission audit](./meta_permission_audit_2026-08-15.md).
