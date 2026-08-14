import crypto from "node:crypto";
import type { Express, Request, RequestHandler, Response } from "express";
import { processDueConversationJobs } from "./jobWorker";

export const WORKER_PROCESS_PATH = "/api/internal/worker/process-conversations";
const DEFAULT_JOB_LIMIT = 20;
const MAX_JOB_LIMIT = 50;

type WorkerRunResult = Awaited<ReturnType<typeof processDueConversationJobs>>;

type WorkerTriggerDependencies = {
  secret?: string;
  processJobs?: (limit: number) => Promise<WorkerRunResult>;
  now?: () => Date;
};

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * This endpoint is for a platform-owned scheduler only. It is not a tenant API,
 * so it never accepts a Meta token, organization id, or job payload from the caller.
 */
export function isWorkerTriggerAuthorized(authorization: string | undefined, configuredSecret: string | undefined) {
  if (!configuredSecret || configuredSecret.length < 32 || !authorization?.startsWith("Bearer ")) return false;
  const providedSecret = authorization.slice("Bearer ".length);
  return Boolean(providedSecret) && constantTimeEqual(providedSecret, configuredSecret);
}

export function parseWorkerJobLimit(rawLimit: unknown) {
  if (rawLimit === undefined) return DEFAULT_JOB_LIMIT;
  if (typeof rawLimit !== "string" || !/^\d+$/.test(rawLimit)) return null;
  const limit = Number(rawLimit);
  return Number.isSafeInteger(limit) && limit >= 1 && limit <= MAX_JOB_LIMIT ? limit : null;
}

export function createWorkerProcessHandler(dependencies: WorkerTriggerDependencies = {}): RequestHandler {
  const configuredSecret = Object.hasOwn(dependencies, "secret") ? dependencies.secret : process.env.WORKER_TRIGGER_SECRET;
  const processJobs = dependencies.processJobs ?? processDueConversationJobs;
  const now = dependencies.now ?? (() => new Date());

  return async (request: Request, response: Response) => {
    response.setHeader("Cache-Control", "no-store");

    if (!configuredSecret || configuredSecret.length < 32) {
      response.status(503).json({ code: "worker_trigger_not_configured" });
      return;
    }

    if (!isWorkerTriggerAuthorized(request.header("authorization"), configuredSecret)) {
      response.status(401).json({ code: "unauthorized" });
      return;
    }

    const limit = parseWorkerJobLimit(request.query.limit);
    if (limit === null) {
      response.status(400).json({ code: "invalid_limit" });
      return;
    }

    try {
      const results = await processJobs(limit);
      const completed = results.filter((result) => result.status === "completed").length;
      response.status(200).json({
        status: "ok",
        attempted: results.length,
        completed,
        failed: results.length - completed,
        processedAt: now().toISOString(),
      });
    } catch {
      // Never disclose database, provider, or tenant details to a scheduler response.
      response.status(500).json({ code: "worker_run_failed" });
    }
  };
}

export function registerWorkerTriggerRoutes(app: Express) {
  app.post(WORKER_PROCESS_PATH, createWorkerProcessHandler());
}
