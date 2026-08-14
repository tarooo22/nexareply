import { describe, expect, it } from "vitest";
import { runTenantReadinessBenchmark } from "./operationalBenchmark";

describe("100-organization operational readiness benchmark", () => {
  it("probes 100 isolated tenant scopes without any platform customer ceiling", async () => {
    const organizationIds = Array.from({ length: 100 }, (_, index) => index + 10_000);
    const result = await runTenantReadinessBenchmark(organizationIds, async (organizationId) => ({ queuePending: organizationId % 3, pageCount: organizationId % 5 }));

    expect(result.organizationCount).toBe(100);
    expect(result.uniqueOrganizationCount).toBe(100);
    expect(result.samples).toHaveLength(100);
    expect(result.samples.every((sample) => organizationIds.includes(sample.organizationId))).toBe(true);
  });
});
