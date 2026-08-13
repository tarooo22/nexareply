import { createDatabaseBackedDemoDraft } from "./demoAiService";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";

/**
 * Worker adapter only. Production must invoke it from a durable worker/scheduler.
 * Autoscale request handling does not guarantee a 10-second execution window.
 */
export async function processDueConversationJobs(limit = 20) {
  const jobs = await nexareplyRepository.dueConversationJobs(limit);
  const results: Array<{ jobId: number; status: "completed" | "failed" }> = [];
  for (const job of jobs) {
    const scope: WorkspaceScope = { organizationId: job.organizationId, role: "owner", isDemo: false };
    try {
      await nexareplyRepository.markJob(scope, job.id, "processing");
      if (!job.conversationId) throw new Error("Conversation job has no conversationId");
      await createDatabaseBackedDemoDraft(scope, job.conversationId);
      await nexareplyRepository.markJob(scope, job.id, "completed");
      results.push({ jobId: job.id, status: "completed" });
    } catch (error) {
      await nexareplyRepository.markJob(scope, job.id, "failed", error instanceof Error ? error.message : "Unknown job error");
      results.push({ jobId: job.id, status: "failed" });
    }
  }
  return results;
}
