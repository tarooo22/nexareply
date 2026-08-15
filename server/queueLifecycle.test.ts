import { afterEach, describe, expect, it, vi } from "vitest";
import { nexareplyRepository } from "./nexareplyRepository";

afterEach(() => vi.restoreAllMocks());

describe("queue retry and dead-letter contracts", () => {
  it("keeps retry/dead-letter failure data scoped to the owner organization", async () => {
    const scope = { organizationId: 7101, role: "owner" as const, isDemo: false };
    const jobs = vi.spyOn(nexareplyRepository, "listQueueFailures").mockResolvedValue([{ id: 77, conversationId: 11, status: "dead_letter", attempts: 5, maxAttempts: 5, scheduledAt: new Date(), lastAttemptAt: new Date(), deadLetteredAt: new Date(), lastError: "internal-only", updatedAt: new Date() }] as never);
    await expect(nexareplyRepository.listQueueFailures(scope)).resolves.toHaveLength(1);
    expect(jobs).toHaveBeenCalledWith(scope);
  });

  it("redrives only an organization-scoped dead-letter job", async () => {
    const scope = { organizationId: 7101, role: "owner" as const, isDemo: false };
    const redrive = vi.spyOn(nexareplyRepository, "redriveDeadLetterJob").mockResolvedValue({ id: 77, status: "retrying" } as never);
    await expect(nexareplyRepository.redriveDeadLetterJob(scope, 77)).resolves.toEqual({ id: 77, status: "retrying" });
    expect(redrive).toHaveBeenCalledWith(scope, 77);
  });
});
