# NexaReply — Phase 6 Tickets and Notifications Audit

**Audit date:** 2026-08-24

## Verified foundations

| Control | Verified behavior |
|---|---|
| Tenant isolation | Ticket and notification reads/mutations resolve workspace scope server-side. |
| Handoff dedupe | Handoff and unknown-question tickets/notifications use tenant-scoped idempotency keys. |
| Lifecycle | Open tickets can be resolved; notifications can be marked individually or all at once. |
| Safe presentation | Ticket and alert DTOs omit provider credentials, token material and raw worker payloads. |

## Confirmed UI gaps

Tickets has loading and empty states but no query-error recovery and no explicit resolve outcome. Alerts has loading and empty states but no query-error recovery and no explicit mark-read success/error state. The safe Phase 6 repair is client presentation only: add retry actions and accessible feedback while preserving the existing tenant-scoped server mutations.

## Implemented repair and validation

Tickets now shows a retryable error state and an accessible resolve result after a mutation succeeds or fails. Alerts now shows a retryable error state and an accessible result for individual and mark-all read actions. The existing server-side membership/tenant checks and idempotent handoff/notification creation remain unchanged. TypeScript, workspace contract/authorization tests, the complete Vitest suite and production build passed after the repair.
