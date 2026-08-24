# NexaReply — Phase 1 Baseline Audit Findings

**Audit date:** 2026-08-24  
**Scope:** Tenant isolation, Meta OAuth/manual connection, webhook and token boundaries, queue/worker truthfulness, self-service UI state, and existing regression coverage.  
**Protected baseline:** The active Khavsi connection and all managed secrets were inspected only through source/config contracts. No credential, callback, Page connection, or live delivery state was changed.

## Confirmed foundations

| Area | Verified current contract |
|---|---|
| Tenant scope | `workspaceScope()` resolves organization access from the authenticated user’s membership; repository queries use organization predicates. Products, conversations, messages, tickets, notifications, Meta vault, OAuth sessions, webhook events, jobs, rate limits, invitations, and account-deletion records carry tenant ownership. |
| Workspace bootstrap | A new user can receive a live organization, owner membership, starter trial, onboarding row, and unconfigured integration records transactionally. |
| Meta vault | OAuth and manual Page credentials are encrypted before persistence. OAuth page-list DTOs only expose Page ID/name; staged credentials are tenant/session scoped and short-lived. |
| Manual Page proof | Manual connection resolves the supplied Page credential at `/me?fields=id,name`, requires an exact submitted Page-ID match, uses App Secret Proof, and form-encodes `subscribed_fields` for webhook subscription. |
| Webhook | GET challenge uses constant-time token comparison. POST signature validation is HMAC-SHA-256 over raw body. Incoming events are tenant-resolved by Page ID and deduplicated before conversation/job mutation. |
| Queue contract | Jobs have tenant ownership, idempotency key, status, lease, retry/backoff, dead-letter, redrive, and queue-status records. The UI-facing status correctly states that the 10-second guarantee is not active and an external durable worker is required. |
| Role boundary | Meta configuration and queue remediation are owner-protected; operator-only paths cannot directly access those procedures. |
| Existing coverage | Current tests cover tenant authorization, manual identity mismatch, staged-token redaction, webhook dedupe, App Secret Proof for manual/OAuth subscription, disconnected-vault preservation, and worker-trigger authorization. |

## Confirmed Phase 1 remediation gaps

| Priority | Confirmed gap | Risk | Minimal Phase 1 repair |
|---|---|---|---|
| Critical | Any workspace owner can call `owner.meta.verifyToken`, and `MetaConnectionWizard` renders/copies the global App-level Verify Token. | A shared App secret is exposed across tenants and conflicts with the server-only secret boundary. | Remove the tRPC getter and browser rendering/copy flow. Keep Verify Token rotation as a separate, platform-owner-managed workflow; manual Page connection must not require this token. |
| High | OAuth Page selection validates with `/{page-id}?fields=id,name`, while manual connection already validates with Page-token `/me?fields=id,name`. | The OAuth direct flow can create an unnecessary `pages_read_engagement` dependency, contradicting the narrower declared permission scope. | Reuse Page-token self-identity validation in OAuth selection; remove `pages_read_engagement` from generic fallback scope once no direct code path requires it. |
| High | Manual setup UI tells each workspace owner to configure the shared App Webhook URL and Verify Token in Meta Dashboard. | This is inaccurate for multi-tenant self-service onboarding and encourages global App-level changes by tenant owners. | Replace it with Georgian guidance: NexaReply platform webhook is managed centrally; the owner supplies only a Page ID and matching Page Access Token for the optional fallback, and server-side subscription is automatic. |
| High | Outbound Messenger send and Page disconnect calls do not attach App Secret Proof even though Page-token validation/subscription calls do. | Apps enforcing App Secret Proof can reject or weaken consistency of token-bound Graph requests. | Add server-only App Secret Proof to `/{page-id}/messages` and `/{page-id}/subscribed_apps` DELETE calls; add exact request-contract regression tests. |
| Medium | Raw provider text is persisted through `safeProviderError()` and `getConnectionStatus()` returns `lastError` to the browser. | A Graph response may carry provider/internal request context and violates the plan’s categorized-error boundary. | Persist/return a safe category or generic operational message only; retain detailed diagnostics only in protected server logs where allowed, without token/credential material. |
| Medium | `connectionRecoveryMessage` is computed in the wizard but never rendered; the Overview card always uses a positive “უსაფრთხო კავშირი” badge even when no Page is connected. | Error/recovery states can be silent or visually misleading. | Render recovery feedback and make the overview badge conditional on the actual status (`connected`, `verification_failed`, `delivery_failed`, `unconfigured`, `disabled`). |

## Deferred by design — not Phase 1 claims

| Area | Current truth | Planned phase |
|---|---|---|
| External Facebook account OAuth | Development-mode generic fallback is role-user testing only; external non-role connection needs Business Verification, Advanced Access/App Review, Live/Public mode, and a fresh-account retest. | Meta rollout phase |
| `META_LOGIN_CONFIG_ID` | Empty by design until the platform owner creates and validates a Facebook Login for Business production configuration. | Meta rollout phase |
| 10-second debounce SLA | Durable DB jobs exist, but the worker trigger is not configured/deployed for an independently measured 10-second guarantee. The current 60-second status is an honest non-SLA indicator. | Worker/hosting phase |
| AI execution | Current worker invokes the database-backed draft adapter. Structured LLM grounding, quota, evidence validation, and unknown-question handoff are separate vertical-slice work. | Knowledge/AI + worker phases |
| Billing | Trial/entitlement foundations exist; no payment provider or checkout should be enabled without explicit provider/account approval. | Billing phase |

## Phase 1 repair order

1. Remove App-level Verify Token exposure from UI and tRPC.
2. Correct manual setup language so tenant owners cannot be directed to change platform-wide webhook settings.
3. Switch OAuth Page selection to Page-token self-identity validation and remove the unnecessary generic `pages_read_engagement` scope.
4. Add App Secret Proof to send/disconnect Page-token Graph calls.
5. Replace raw provider error DTOs with safe categories and render actual recovery/connection status.
6. Add regression coverage; run TypeScript, full Vitest, production build, and desktop/mobile UI smoke; then checkpoint.

## Phase 1 validation outcome

The focused Meta/secret-boundary suite passed after the repair. The complete quality gate passed: `pnpm exec tsc --noEmit`, 117 passing Vitest tests with 2 managed-secret integration tests intentionally skipped, and the production build. The existing Vite large-chunk advisory remains a planned performance item; it did not fail the build.

Desktop and 375px mobile smoke checks passed for Home, Demo and the protected workspace entry state. The new recovery/status copy did not introduce horizontal overflow in the inspected public/demo surfaces. The protected workspace remains correctly gated when no session is present. No live Meta connection, credential, callback, secret, or Page subscription was changed during validation.
