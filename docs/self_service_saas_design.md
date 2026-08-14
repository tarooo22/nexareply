# Self-Service SaaS and Inbox Automation Design

## Tenant-first model

Every protected request resolves a `WorkspaceScope` from the authenticated user and requested organization. New organization creation is an explicit owner action, not a demo bootstrap side effect. A database transaction creates the organization, its owner membership, initial integration statuses, onboarding record, and trial subscription together. A retry-safe generated slug is unique but has no relation to another customer’s identifier.

| Domain object | Required behavior |
|---|---|
| `organizations` | Remains the tenant root. Creation is available to authenticated users; listing returns memberships only. |
| `organization_memberships` | Continues to be the sole authorization join. A request never accepts a role from the client. |
| `organization_subscriptions` | One active/trial lifecycle record per tenant, carrying plan reference and immutable period/trial timestamps. |
| `plan_entitlements` | Dynamic rows such as `ai_automation`, `monthly_ai_replies`, `channels`, and `member_limit`. A plan limits one tenant; it does not constrain platform tenant count. |
| `meta_token_vaults` | Stores only AES-256-GCM ciphertext, key version, provider/Page metadata and token lifecycle timestamps. No plaintext token, app secret, or bearer token is selectable through a DTO. |
| `rate_limit_buckets` | Tenant/action/window counter records for deterministic server-side admission control. |
| `background_jobs` | Gains claim lease, available-at, retry/backoff, and terminal failure metadata. Job handlers must be idempotent and do all tenant resolution from the stored organization ID. |

## Per-organization Meta OAuth and vault sequence

The existing Amadeo route remains a protected pilot compatibility path: its current managed Page credential continues to work without being copied into a new vault. For a new organization, the owner starts OAuth for that exact `WorkspaceScope`; server-only callback code exchanges the code, receives candidate Page credentials, and encrypts candidate token material before persistence. The browser receives only candidate Page IDs and names.

On Page selection, the server verifies the selected candidate belongs to the unexpired owner session, subscribes the Page using the credential held server-side, writes the selected credential into that organization’s encrypted vault, records safe Page metadata in `meta_connections`, and clears transient candidate ciphertext. Send and inbound handlers resolve the Page→organization mapping, then resolve/decrypt only the matching vault token at the point of Graph API use. All response DTOs exclude the vault table and all encrypted values.

## Entitlement resolution

`resolveEntitlements(scope)` derives the active subscription and its plan rows once per protected operation. Mutations that create AI automation work, send through a channel, add a member, or consume an AI reply call a server-side guard before any side effect. A trial is an active entitlement state with its own end time; an expired/paused subscription returns a typed product restriction without leaking plan implementation data. Usage counters remain organization/month scoped and are incremented atomically with quota admission.

## Inbox contract

Conversation lists use opaque cursors based on `(updatedAt, id)` and tenant-first indexes. The detail contract contains conversation state, customer participant summary, latest ticket/handoff state, visible message thread, and evidence references limited to catalog/approved knowledge IDs and titles. Draft creation is server-side, quota-gated and evidence-grounded; it cannot rely on pending knowledge drafts. Operator takeover and AI pause are explicit, audited state transitions, with pending jobs cancelled or rendered no-op before an AI draft can send.

## Queue and worker truthfulness

The queue must use atomic leases and retry-safe handler execution, but an always-on process alone is not a durable delayed scheduler. The platform callback cadence is too coarse for a guaranteed 10-second debounce, and in-process timers are prohibited. The implementation will therefore expose two readiness facts separately: **queue correctness** (idempotency, lease, retry and observability) and **10-second delayed trigger configured**. The UI will only show automation as guaranteed when the latter is backed by a durable delay/queue provider; otherwise it will retain the honest unavailable state.

## Scale safeguards and test benchmark

Tenant-first composite indexes cover conversation cursor reads, vault lookup, entitlement lookup, active jobs, rate-limit windows, and webhook idempotency. A deterministic automated benchmark creates isolated in-memory/test-database tenant fixtures for 100 organizations and asserts no cross-tenant result leakage, bounded cursor pages, and idempotent repeated delivery. The number is a regression benchmark, not a product or database limit.
