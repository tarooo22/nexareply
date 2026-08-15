# Durable Worker Trigger — Deferred by Product Decision

On 2026-08-15, the user elected to defer Cloudflare Queue/Worker provisioning and the live ten-second debounce SLA. NexaReply retains the already implemented database-backed queue core: tenant-scoped jobs, idempotent scheduling, atomic leases, retry backoff, lease-expiry recovery, dead-letter state, HMAC callback boundary, and owner-safe monitoring.

The Cloudflare connector remains disabled and **no external Queue, Worker, callback URL, or worker secret binding was provisioned**. Therefore `tenSecondGuarantee` must remain `false`; the Inbox may show operational counts but must not state that a ten-second production guarantee exists. The optional generic wakeup producer remains unconfigured and is intentionally a no-op without a dispatch URL.

Resuming this phase later requires Cloudflare authorization, creation of the primary and dead-letter queues, deployment of the signing Worker, setting the dispatch URL, and an observed end-to-end SLA/replay/horizontal-worker validation.
