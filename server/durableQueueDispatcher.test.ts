import { describe, expect, it, vi } from "vitest";
import { createDurableQueueWakeupDispatcher } from "./durableQueueDispatcher";
import { createWorkerCallbackSignature } from "./workerCallbackRoutes";

describe("durable queue wakeup dispatcher", () => {
  it("does nothing until a provisioned queue dispatch URL is configured", async () => {
    const fetcher = vi.fn();
    const dispatch = createDurableQueueWakeupDispatcher({ sharedSecret: "x".repeat(32), fetcher });
    await expect(dispatch(10_000)).resolves.toEqual({ configured: false, dispatched: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("emits only a signed generic delay signal without tenant or message payload", async () => {
    const secret = "s".repeat(32);
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const dispatch = createDurableQueueWakeupDispatcher({ dispatchUrl: "https://worker.example/queue", sharedSecret: secret, fetcher, now: () => new Date("2026-08-15T00:00:00.000Z") });
    await expect(dispatch(9_400)).resolves.toEqual({ configured: true, dispatched: true });
    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    const rawBody = Buffer.from(String(request.body));
    expect(JSON.parse(rawBody.toString("utf8"))).toEqual({ delaySeconds: 10, limit: 20 });
    expect(JSON.stringify(request.body)).not.toContain("organizationId");
    expect(request.headers).toMatchObject({ "x-nexareply-worker-signature": createWorkerCallbackSignature(secret, "1786752000", rawBody) });
  });
});
