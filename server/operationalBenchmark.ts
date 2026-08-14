export type TenantReadinessSample = { organizationId: number; queuePending: number; pageCount: number };

/**
 * Exercises one read-only operational probe per tenant. The caller supplies the
 * tenant-scoped implementation so the benchmark can run in CI without seeding
 * customer data, credentials, or mock reviews into a production workspace.
 */
export async function runTenantReadinessBenchmark(
  organizationIds: number[],
  inspectTenant: (organizationId: number) => Promise<Omit<TenantReadinessSample, "organizationId">>,
) {
  const startedAt = performance.now();
  const samples = await Promise.all(organizationIds.map(async (organizationId) => ({ organizationId, ...(await inspectTenant(organizationId)) })));
  return {
    organizationCount: organizationIds.length,
    uniqueOrganizationCount: new Set(samples.map((sample) => sample.organizationId)).size,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    samples,
  };
}
