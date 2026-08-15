import { describe, expect, it, vi } from "vitest";
import { createWorkerCallbackHandler, createWorkerCallbackSignature, readWorkerCallbackSecret, WORKER_PROCESS_PATH } from "./workerCallbackRoutes";

function responseRecorder() {
  const result: { statusCode?: number; body?: unknown } = {};
  return { status: vi.fn((statusCode: number) => ({ json: vi.fn((body: unknown) => { result.statusCode = statusCode; result.body = body; return body; }) })), result };
}

describe("durable worker callback authentication", () => {
  it("uses the stable process-conversations path expected by the external durable trigger", () => {
    expect(WORKER_PROCESS_PATH).toBe("/api/internal/worker/process-conversations");
  });

  it("accepts an HMAC-signed callback using the configured managed secret", async () => {
    const secret = readWorkerCallbackSecret();
    expect(Buffer.byteLength(secret, "utf8")).toBeGreaterThanOrEqual(32);
    const rawBody = Buffer.from(JSON.stringify({ limit: 4 }));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const response = responseRecorder();
    const processJobs = vi.fn().mockResolvedValue([{ jobId: 1, status: "completed" }, { jobId: 2, status: "failed" }]);

    await createWorkerCallbackHandler(processJobs)({ body: rawBody, header: (name: string) => name === "x-nexareply-worker-timestamp" ? timestamp : createWorkerCallbackSignature(secret, timestamp, rawBody) } as never, response as never);

    expect(processJobs).toHaveBeenCalledWith(4);
    expect(response.result).toEqual({ statusCode: 200, body: { accepted: true, processed: 1, retrying: 0, deadLetter: 0, failed: 1 } });
  });

  it("rejects unsigned callbacks before any durable job claim", async () => {
    const response = responseRecorder();
    const processJobs = vi.fn();
    await createWorkerCallbackHandler(processJobs)({ body: Buffer.from("{}"), header: () => undefined } as never, response as never);
    expect(processJobs).not.toHaveBeenCalled();
    expect(response.result.statusCode).toBe(401);
  });
});
