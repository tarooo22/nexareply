import crypto from "node:crypto";
import express, { type Express, type Request, type Response } from "express";
import { processDueConversationJobs } from "./jobWorker";

const MAX_TIMESTAMP_SKEW_MS = 60_000;
/** Stable external path shared with the managed Cloudflare Queue Worker. */
export const WORKER_PROCESS_PATH = "/api/internal/worker/process-conversations";

export function readWorkerCallbackSecret() {
  const secret = process.env.WORKER_CALLBACK_SHARED_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) throw new Error("Worker callback secret is not configured.");
  return secret;
}

export function createWorkerCallbackSignature(secret: string, timestamp: string, rawBody: Buffer) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex");
}

function signatureIsValid(secret: string, timestamp: string, rawBody: Buffer, received: string | undefined) {
  if (!received || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const expected = Buffer.from(createWorkerCallbackSignature(secret, timestamp, rawBody), "hex");
  const actual = Buffer.from(received, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

type ProcessJobs = (limit: number) => Promise<Array<{ jobId: number; status: "completed" | "failed" | "retrying" | "dead_letter" }>>;

export function createWorkerCallbackHandler(processJobs: ProcessJobs = processDueConversationJobs) {
  return async (req: Request, res: Response) => {
    try {
      const timestamp = req.header("x-nexareply-worker-timestamp") ?? "";
      const signature = req.header("x-nexareply-worker-signature");
      const timestampMs = Number(timestamp) * 1000;
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const secret = readWorkerCallbackSecret();
      if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_TIMESTAMP_SKEW_MS || !signatureIsValid(secret, timestamp, rawBody, signature)) {
        return res.status(401).json({ error: "worker_authentication_failed" });
      }
      const payload = JSON.parse(rawBody.toString("utf8")) as { limit?: unknown };
      const limit = typeof payload.limit === "number" && Number.isInteger(payload.limit) ? Math.min(Math.max(payload.limit, 1), 50) : 20;
      const results = await processJobs(limit);
      return res.status(200).json({ accepted: true, processed: results.filter((result) => result.status === "completed").length, retrying: results.filter((result) => result.status === "retrying").length, deadLetter: results.filter((result) => result.status === "dead_letter").length, failed: results.filter((result) => result.status === "failed").length });
    } catch {
      return res.status(500).json({ error: "worker_execution_failed" });
    }
  };
}

export function registerWorkerCallbackRoutes(app: Express) {
  app.post(WORKER_PROCESS_PATH, express.raw({ type: "application/json", limit: "16kb" }), createWorkerCallbackHandler());
}
