# Durable worker trigger

NexaReply stores every deferred conversation action in `background_jobs` and uses database leases so more than one stateless worker can safely claim due work. The application process itself is deliberately **not** a timer or queue worker.

## Server secret

Create a new random managed server secret named `WORKER_TRIGGER_SECRET`. It must be at least 32 characters and must not reuse `META_TOKEN_ENCRYPTION_KEY`, any Meta credential, a password, or a JWT secret.

The secret is read by the server only. Do not expose it in the browser, tRPC responses, logs, screenshots, source control, or customer configuration.

## Scheduler request

Deploy a platform-owned durable scheduler or worker that calls the published application on this exact route:

```text
POST https://<your-domain>/api/internal/worker/process-conversations?limit=20
Authorization: Bearer <WORKER_TRIGGER_SECRET>
```

The route accepts only a bounded `limit` from 1 to 50. It does not accept tenant identifiers, Page tokens, or job payloads. Its response contains aggregate counts only; it never returns job IDs, customer data, provider tokens, lease tokens, or error internals.

## Ten-second target

To meet a ten-second debounce target, the durable worker must be scheduled at a cadence of **five seconds or less** and must have enough concurrency for the live workload. A one-minute cron is useful for recovery but does **not** meet this target.

Keep the application UI honest until the scheduler has actually been deployed and observed: the presence of `WORKER_TRIGGER_SECRET` alone is not a delivery guarantee.
