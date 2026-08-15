import { createDatabaseBackedDemoDraft } from "./demoAiService";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";
import crypto from "node:crypto";

/**
 * Worker adapter only. Production must invoke it from a durable worker/scheduler.
 * Autoscale request handling does not guarantee a 10-second execution window.
 */
export async function processDueConversationJobs(limit = 20) {
  const leaseToken = crypto.randomBytes(24).toString("base64url");
  const jobs = await nexareplyRepository.claimDueConversationJobs(limit, leaseToken, new Date(Date.now() + 2 * 60_000));
  const results: Array<{ jobId: number; status: "completed" | "retrying" | "dead_letter" | "failed" }> = [];
  for (const job of jobs) {
    const scope: WorkspaceScope = { organizationId: job.organizationId, role: "owner", isDemo: false };
    try {
      if (!job.conversationId) throw new Error("Conversation job has no conversationId");
      await createDatabaseBackedDemoDraft(scope, job.conversationId);
      await nexareplyRepository.completeLeasedJob(scope, job.id, leaseToken, "completed");
      results.push({ jobId: job.id, status: "completed" });
    } catch (error) {
      const transition = await nexareplyRepository.retryLeasedJob(scope, job.id, leaseToken, error instanceof Error ? error.message : "Unknown job error");
      results.push({ jobId: job.id, status: transition.status });
    }
  }
  return results;
}
