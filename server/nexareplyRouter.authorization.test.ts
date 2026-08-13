import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { nexareplyRepository } from "./nexareplyRepository";
import { appRouter } from "./routers";

function operatorContext(): TrpcContext {
  return {
    user: { id: 42, openId: "operator-user", email: "operator@example.com", name: "Operator", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => vi.restoreAllMocks());

describe("owner-only NexaReply router procedures", () => {
  it("forbids an operator before integration or membership data is read", async () => {
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue({ organizationId: 1, role: "operator", isDemo: false, actorUserId: 42 });
    const caller = appRouter.createCaller(operatorContext());
    await expect(caller.nexareply.workspace.owner.integrationStates({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.list({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.setRole({ organizationId: 1, userId: 99, role: "operator" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.imports.commit({ organizationId: 1, fileName: "catalog.csv", base64: "YQ==" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
