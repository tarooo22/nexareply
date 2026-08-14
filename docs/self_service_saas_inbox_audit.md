# Self-Service SaaS and Inbox Automation Audit

## Audit scope

This audit covers the self-service organization lifecycle, tenant isolation, Meta Messenger connection path, plan enforcement, Inbox contracts, background execution, and operational safeguards before the next vertical slice. The existing **Amadeo ⋅ ამადეო** Page is a live pilot connection and is not migrated, rotated, re-authorized, or mutated by this work.

## Current state and required change

| Area | Current implementation | Required vertical-slice direction |
|---|---|---|
| Workspace lifecycle | The first protected bootstrap creates a single `workspace-{userId}` organization and owner membership. Membership-scoped queries already deny access without a matching organization membership. | Add explicit self-service create/list/switch workspace actions with collision-safe slugs and a transactional owner membership. The platform has no hard-coded organization ceiling. |
| Tenant isolation | Repository methods are consistently passed a `WorkspaceScope`; core rows carry `organizationId`; current tests cover selected cross-tenant denial. | Make organization scope resolution reusable at API boundaries, extend isolation coverage to new vault, entitlement, queue, pagination, and Inbox routes. |
| Meta connection | OAuth session/Page candidate ownership is organization-scoped, but selected Page subscription and send delivery still use one global managed Page access token. | Keep the current Amadeo global-managed pilot path as an immutable compatibility route. Add a separate encrypted token-vault record for newly connected customer organizations and resolve the correct tenant token server-side only. |
| Token protection | `META_TOKEN_ENCRYPTION_KEY` is now configured and a server-only AES-256-GCM vault probe passes. No value is returned or logged. | Encrypt only token ciphertext/version/metadata at rest; never persist plaintext tokens, include them in DTOs, logs, audit payloads, errors, or browser code. OAuth transient tokens must be encrypted while awaiting Page selection and cleared on completion/expiry. |
| Plans and trials | `plans` currently has only `monthlyReplyQuota`; bootstrap seeds one demo plan. | Add plan/trial entitlement records and server-side checks for automation, AI quota, channels, member limits, and product features. Limits constrain a tenant plan, not total platform customers. |
| Inbox | Conversations, messages, participants, takeover, AI pause, tickets, and idempotent Meta ingestion are already persistent and organization-scoped. List endpoints are unpaginated and draft evidence/customer context are incomplete. | Add cursor pagination, customer summary, evidence DTOs, explicit operator/AI controls, quota-aware draft/generation states, and no-invention handoff behavior. |
| Queue and webhook dedupe | Webhook events, messages, tickets, notifications, and pending jobs already use tenant-aware idempotency keys. The current worker simply scans due jobs, has no atomic claim/lease/backoff, and is not scheduled durably. | Add atomic job claim/lease/retry/dead-letter semantics and monitoring. A worker must run outside request lifecycle. |
| 10-second automation | Always-on hosting has been selected, but the platform’s scheduled callback minimum is 60 seconds and in-process timers are not a durable scheduling mechanism. | The UI remains explicit that 10-second automation is **not guaranteed** until a delayed, durable queue trigger is configured. A database queue alone is not a production timer. The current vertical slice can make jobs correct/idempotent/observable and surface readiness honestly; it must not claim the guarantee early. |
| Scale safeguards | Core indexes cover common organization/status lookups, but Inbox pagination, rate-limit buckets, queue leases, and tenant metrics are missing. | Add tenant-first composite indexes, opaque cursors, rate limits, health/lag metrics, and a 100-organization automated load benchmark. The benchmark is a regression target, never a platform ceiling. |

## Current safe architecture decision

The API remains stateless: session authentication identifies the user, server-side scope resolution authorizes an organization for every protected operation, and storage/database records are organization-scoped. New customer Page tokens will enter the encrypted vault only after an owner-selected Page OAuth flow succeeds. The old Amadeo connection remains on its existing managed credential path until an explicit, separately tested migration is requested.

The new persistent hosting setting permits a continuously available worker process, but it does not by itself supply a durable 10-second delayed-job trigger. The current implementation must use platform-managed periodic callbacks only where their cadence is sufficient, and must retain a visible not-ready state for the shorter debounce requirement until a suitable durable queue trigger is provisioned.

## Acceptance checks for the next slices

Every slice must add or extend tenant-isolation, repeated webhook/job dedupe, secret-boundary, authorization, entitlement, pagination, and failure-state tests. TypeScript, the full Vitest suite, production build, responsive QA, and a read-safe Amadeo connection check are required before publishing. No test or demo data may be inserted into the live Amadeo workspace.
