import { createWorkerCallbackSignature } from "./workerCallbackRoutes";

const DEFAULT_LIMIT = 20;

type DispatcherDependencies = {
  dispatchUrl?: string;
  sharedSecret?: string;
  fetcher?: typeof fetch;
  now?: () => Date;
};

/**
 * Emits a generic wakeup only. Organization IDs, conversation IDs, customer data,
 * Meta credentials, and database payloads remain in NexaReply's job table.
 */
export function createDurableQueueWakeupDispatcher(dependencies: DispatcherDependencies = {}) {
  const dispatchUrl = dependencies.dispatchUrl ?? process.env.CLOUDFLARE_QUEUE_DISPATCH_URL?.trim();
  const sharedSecret = dependencies.sharedSecret ?? process.env.WORKER_CALLBACK_SHARED_SECRET;
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now ?? (() => new Date());

  return async function dispatchWakeup(delayMs: number) {
    if (!dispatchUrl || !sharedSecret || Buffer.byteLength(sharedSecret, "utf8") < 32) return { configured: false as const, dispatched: false as const };
    const timestamp = String(Math.floor(now().getTime() / 1000));
    const body = Buffer.from(JSON.stringify({ delaySeconds: Math.min(86_400, Math.max(0, Math.ceil(delayMs / 1000))), limit: DEFAULT_LIMIT }));
    const signature = createWorkerCallbackSignature(sharedSecret, timestamp, body);
    const response = await fetcher(dispatchUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nexareply-worker-timestamp": timestamp,
        "x-nexareply-worker-signature": signature,
      },
      body,
      signal: AbortSignal.timeout(3_000),
    });
    return { configured: true as const, dispatched: response.ok };
  };
}

export const dispatchDurableQueueWakeup = createDurableQueueWakeupDispatcher();
