import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { nexareplyRepository } from "./nexareplyRepository";
import { appRouter } from "./routers";

function publicContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function nonMemberContext(): TrpcContext {
  return { user: { id: 9_999_999, openId: "non-member", email: "none@example.com", name: "Non member", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("persistent multi-tenant foundation", () => {
  it("reads the seeded public Demo catalog and DB-derived analytics through tRPC", async () => {
    const caller = appRouter.createCaller(publicContext());
    const products = await caller.nexareply.demo.data.products.list();
    const analytics = await caller.nexareply.demo.data.analytics();
    expect(products.length).toBeGreaterThan(0);
    expect(analytics.conversationCount).toBeGreaterThan(0);
    expect(analytics.dailyVolume.length).toBeGreaterThan(0);
  });

  it("denies a user without a membership for the seeded demo organization", async () => {
    const demoScope = await nexareplyRepository.getPublicDemoScope();
    await expect(nexareplyRepository.getWorkspaceScope(9_999_999, demoScope.organizationId)).resolves.toBeNull();
    const protectedCaller = appRouter.createCaller(nonMemberContext());
    await expect(protectedCaller.nexareply.workspace.products.list({ organizationId: demoScope.organizationId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exports persisted lead and draft-order rows as CSV", async () => {
    const caller = appRouter.createCaller(publicContext());
    const leadsCsv = await caller.nexareply.demo.imports.exportCsv({ kind: "leads" });
    const ordersCsv = await caller.nexareply.demo.imports.exportCsv({ kind: "orders" });
    expect(leadsCsv).toContain('"სახელი","ტელეფონი","წყარო"');
    expect(leadsCsv.split("\n").length).toBeGreaterThan(1);
    expect(ordersCsv).toContain('"კლიენტი","სტატუსი"');
    expect(ordersCsv.split("\n").length).toBeGreaterThan(1);
  });
});
