# Cloudflare Durable Queue Trigger

This project incorporates the user-provided archive's durable trigger intent while retaining the newer NexaReply security boundary. The external worker invokes the stable callback path below, but it **does not** use the archive's bearer-secret implementation. Instead, NexaReply verifies an HMAC-SHA-256 signature over the exact JSON body and timestamp; this constrains replay attempts and avoids accepting tenant IDs, job payloads, or Meta credentials from the external caller.

```text
POST https://nexareply-2chxuc4s.manus.space/api/internal/worker/process-conversations
Headers:
  X-NexaReply-Worker-Timestamp: <unix seconds>
  X-NexaReply-Worker-Signature: <HMAC_SHA256(timestamp + "." + raw JSON body)>
Body:
  {"limit": 20}
```

## Queue resources

| Resource | Purpose | Configuration |
| --- | --- | --- |
| `nexareply-conversation-jobs` | Delivers deferred conversation processing after debounce eligibility. | Batch size `1`, wait `0`, retry delay `10s`, maximum retries `5`. |
| `nexareply-conversation-dead-letter` | Receives messages that exhaust the consumer retry policy. | Owner-visible redrive is handled through the protected NexaReply API. |
| `nexareply-durable-queue-worker` | Signs and sends aggregate queue processing requests to NexaReply. | No Meta access token, tenant secret, customer content, or provider credential is stored in worker message payloads. |

The worker message contains only a non-sensitive execution trigger and bounded batch limit. Database jobs remain the source of truth for organization scope, leases, deduplication, retries, backoff, and dead-letter state. Cloudflare Queue consumers can delay messages, retry work, and send exhausted messages to a dead-letter queue. [1] [2]

> A ten-second target is reportable only after the queue, consumer, worker secret, and production callback have been provisioned and observed end-to-end. Before that point, Inbox monitoring must keep `tenSecondGuarantee` false.

## References

[1]: https://developers.cloudflare.com/queues/configuration/batching-retries/ "Cloudflare Queues — batching, retries, and delays"
[2]: https://developers.cloudflare.com/queues/configuration/dead-letter-queues/ "Cloudflare Queues — dead-letter queues"
