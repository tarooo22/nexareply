import { afterEach, describe, expect, it, vi } from "vitest";
import { processDueConversationJobs } from "./jobWorker";
import { nexareplyRepository } from "./nexareplyRepository";

afterEach(() => vi.restoreAllMocks());

describe("durable conversation worker lease flow", () => {
  it("claims jobs with one lease and completes only through the matching lease token", async () => {
    vi.spyOn(nexareplyRepository, "claimDueConversationJobs").mockResolvedValue([{ id: 501, organizationId: 41, conversationId: 301 }] as never);
    const draft = vi.spyOn(await import("./demoAiService"), "createDatabaseBackedDemoDraft").mockResolvedValue({ decision: "draft", text: "დადასტურებული პასუხი", source: "knowledge" });
    const complete = vi.spyOn(nexareplyRepository, "completeLeasedJob").mockResolvedValue(undefined);

    await expect(processDueConversationJobs(10)).resolves.toEqual([{ jobId: 501, status: "completed" }]);

    expect(draft).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 41 }), 301);
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 41 }), 501, expect.any(String), "completed");
    const leaseToken = vi.mocked(nexareplyRepository.claimDueConversationJobs).mock.calls[0]?.[1];
    expect(complete).toHaveBeenCalledWith(expect.anything(), 501, leaseToken, "completed");
  });

  it("records a failed lease completion when one job cannot be drafted", async () => {
    vi.spyOn(nexareplyRepository, "claimDueConversationJobs").mockResolvedValue([{ id: 502, organizationId: 42, conversationId: null }] as never);
    const complete = vi.spyOn(nexareplyRepository, "completeLeasedJob").mockResolvedValue(undefined);

    await expect(processDueConversationJobs(10)).resolves.toEqual([{ jobId: 502, status: "failed" }]);
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 42 }), 502, expect.any(String), "failed", "Conversation job has no conversationId");
  });
});
