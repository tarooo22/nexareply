# NexaReply Queue, Pagination, Rate-Limit, and Monitoring Readiness

## Current durable data contract

NexaReply uses tenant-scoped records in `background_jobs`. A Messenger inbound event creates or reschedules one pending `process_conversation` job using an organization-scoped idempotency key. Workers claim due jobs with a random lease token and a bounded lease expiry. Completion or failure is recorded only when the worker still owns the same lease, while expired `processing` leases are returned to pending state before the next claim attempt. This permits stateless API instances and prevents a stale worker from finalizing another worker's execution.

| Area | Implemented behavior | Production truth |
| --- | --- | --- |
| Tenant isolation | Every job, cursor query, rate bucket, and status query includes `organizationId`. | There is no cross-organization work retrieval API. |
| Idempotency | Inbound events, tickets, notifications, and pending conversation jobs use organization-scoped dedupe keys. | Repeated webhooks do not create repeated visible work. |
| Atomic processing | Lease token and lease expiry protect claims; expired leases are reclaimable. | Suitable for multiple stateless workers when they invoke the same database contract. |
| Pagination | `workspace.conversations.listPage` uses a stable `(updatedAt, id)` cursor, a maximum page size of 50, and a matching composite index. | The legacy list procedure remains for compatibility; new scale-sensitive callers must use the cursor procedure. |
| Delivery throttling | Outbound Meta sends consume a database-backed `meta_outbound` tenant bucket, capped at 120 requests per minute. | Rate-limit rejection occurs before the Graph API call. |
| Monitoring | `workspace.operations.queueStatus` exposes only counts, oldest pending time, overdue work, and scheduler truth. | Provider tokens, job payloads, and lease tokens are never returned. |

## 10-second debounce guarantee

> The database job contract exists, but a **10-second production guarantee is not enabled by the current hosting configuration**.

The platform scheduler has a minimum cadence of 60 seconds, so it can provide periodic recovery but cannot meet a ten-second SLA. In-process timers are deliberately not used because they do not survive deployment lifecycle or scale-out. A protected server-side trigger now exists at `POST /api/internal/worker/process-conversations`; a separately deployed durable queue trigger/worker must call it at a cadence of five seconds or less to claim due jobs within ten seconds. That worker must preserve the existing lease-token completion, retry/backoff, and tenant context; it must not read provider credentials directly. See [durable_worker_trigger.md](durable_worker_trigger.md) for the managed-secret contract.

## 100-organization readiness benchmark

The engineering benchmark is **100 organizations, not a product ceiling**. The benchmark exercises isolated cursor reads and queue status reads for 100 organization scopes, verifies that each query is organization-filtered, and records the elapsed wall-clock time. It does not seed customer messages, Page credentials, or fabricated reviews. The benchmark is a readiness signal for indexing and query fan-out; capacity planning still depends on live traffic, database tier, Meta limits, and the eventual durable worker deployment.

The read-only managed-database benchmark was executed on 2026-08-14 against 100 intentionally nonexistent organization IDs. All cursor and queue-status reads returned empty tenant-scoped results, completed without inserting data, and finished in approximately **2.19 seconds** wall-clock time. This establishes the current query-shape baseline; it is not an SLA or a maximum customer count.

## Operator actions and alerts

Operators can observe queue status through the protected operations contract and should treat `overdue > 0`, `failed > 0`, or `schedulerStatus = external_durable_worker_required` as operational conditions. Until a dedicated trigger is deployed, the interface must continue to state that the 10-second target is not guaranteed. The existing Inbox remains usable for manual review, evidence-backed drafts, operator takeover, and handoff tickets regardless of scheduler state.
