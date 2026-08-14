import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { createWorkerProcessHandler, isWorkerTriggerAuthorized, parseWorkerJobLimit } from "./workerTriggerRoutes";

const workerSecret = "O99fNYwpibIHlUs4uLqAUmsi8EuJr7aHiv9V4aQKLe8";

function requestFor(authorization?: string, limit?: unknown) {
  return {
    header: vi.fn().mockReturnValue(authorization),
    query: limit === undefined ? {} : { limit },
  } as unknown as Request;
}

function responseRecorder() {
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn> };
}

describe("worker trigger authorization", () => {
  it("requires the exact configured server secret", () => {
    expect(isWorkerTriggerAuthorized(`Bearer ${workerSecret}`, workerSecret)).toBe(true);
    expect(isWorkerTriggerAuthorized("Bearer not-the-secret", workerSecret)).toBe(false);
    expect(isWorkerTriggerAuthorized(undefined, workerSecret)).toBe(false);
    expect(isWorkerTriggerAuthorized(`Bearer ${workerSecret}`, "short")).toBe(false);
  });

  it("only accepts a bounded, explicit job limit", () => {
    expect(parseWorkerJobLimit(undefined)).toBe(20);
    expect(parseWorkerJobLimit("12")).toBe(12);
    expect(parseWorkerJobLimit("0")).toBeNull();
    expect(parseWorkerJobLimit("51")).toBeNull();
    expect(parseWorkerJobLimit("12.5")).toBeNull();
  });
});

describe("worker trigger handler", () => {
  it("returns an aggregate-only result for an authorized scheduler", async () => {
    const processJobs = vi.fn().mockResolvedValue([
      { jobId: 9001, status: "completed" },
      { jobId: 9002, status: "failed" },
    ]);
    const handler = createWorkerProcessHandler({ secret: workerSecret, processJobs, now: () => new Date("2026-08-14T10:00:00.000Z") });
    const response = responseRecorder();

    await handler(requestFor(`Bearer ${workerSecret}`, "12"), response, vi.fn());

    expect(processJobs).toHaveBeenCalledWith(12);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ status: "ok", attempted: 2, completed: 1, failed: 1, processedAt: "2026-08-14T10:00:00.000Z" });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain("9001");
  });

  it("does not run jobs when the endpoint is unauthorized or unconfigured", async () => {
    const processJobs = vi.fn();
    const configuredHandler = createWorkerProcessHandler({ secret: workerSecret, processJobs });
    const unauthorizedResponse = responseRecorder();
    await configuredHandler(requestFor("Bearer wrong"), unauthorizedResponse, vi.fn());
    expect(unauthorizedResponse.status).toHaveBeenCalledWith(401);
    expect(processJobs).not.toHaveBeenCalled();

    const unconfiguredHandler = createWorkerProcessHandler({ secret: undefined, processJobs });
    const unconfiguredResponse = responseRecorder();
    await unconfiguredHandler(requestFor(`Bearer ${workerSecret}`), unconfiguredResponse, vi.fn());
    expect(unconfiguredResponse.status).toHaveBeenCalledWith(503);
    expect(processJobs).not.toHaveBeenCalled();
  });
});
