import { describe, expect, it } from "vitest";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";
import { runTenantReadinessBenchmark } from "./operationalBenchmark";

describe("100-organization database readiness benchmark", () => {
  it("executes isolated cursor and queue-status reads without creating tenant data", async () => {
    const organizationIds = Array.from({ length: 100 }, (_, index) => 9_000_000 + index);
    const result = await runTenantReadinessBenchmark(organizationIds, async (organizationId) => {
      const scope: WorkspaceScope = { organizationId, role: "owner", isDemo: false };
      const [page, queue] = await Promise.all([
        nexareplyRepository.listConversationPage(scope, { limit: 10 }),
        nexareplyRepository.getQueueStatus(scope),
      ]);
      return { pageCount: page.items.length, queuePending: queue.pending };
    });

    expect(result.organizationCount).toBe(100);
    expect(result.uniqueOrganizationCount).toBe(100);
    expect(result.samples.every((sample) => sample.pageCount === 0 && sample.queuePending === 0)).toBe(true);
  }, 20_000);
});
