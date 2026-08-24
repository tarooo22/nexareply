# NexaReply — Phase 5 Durable Inbox Automation Audit

**Audit date:** 2026-08-24

## Verified foundations

| Control | Current behavior |
|---|---|
| Durable records | Inbound events are persisted before a queue job is scheduled; queue rows carry tenant scope and do not embed provider credentials. |
| Worker trigger | The internal worker endpoint accepts only a platform secret, accepts no tenant/job payload from the caller, and returns sanitized failures. |
| Lease/retry/DLQ | Jobs are atomically claimed with a lease, reclaimed on expiry, retried with bounded backoff, and can be redriven from dead letter by an owner. |
| Operator visibility | Owner Queue panel shows pending, processing, retrying, failed and dead-letter counts, failed job attempts and a redrive control. |
| SLA honesty | Inbox, onboarding and queue copy explicitly state that the 10-second trigger is not guaranteed until durable hosting/trigger configuration is deployed and measured. |

## Confirmed Phase 5 gap

The redrive action refetches status on success but does not show a dedicated success or error result. Add `role="status"`/`role="alert"` feedback so an owner knows whether the dead-letter job has actually returned to the queue. No in-process timer, scheduler creation, Meta connection or secret change is required for this UI repair.

## Implemented repair and validation

The dead-letter redrive control now visibly reports its pending, successful and failed outcomes while retaining its owner-only server mutation and automatic status/failure refetch on success. The control remains unavailable during mutation. No scheduler or timer was introduced, and the UI continues to state that the 10-second SLA is not active until a durable hosting trigger is configured and measured. TypeScript, queue/worker targeted tests, the complete Vitest suite and production build pass after the repair.
