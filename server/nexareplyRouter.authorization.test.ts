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
  it("creates a self-service organization only for the authenticated user", async () => {
    const created = { id: 77, name: "New Workspace", slug: "workspace-safe", mode: "live" };
    const create = vi.spyOn(nexareplyRepository, "createSelfServiceOrganization").mockResolvedValue(created as never);
    const caller = appRouter.createCaller(operatorContext());
    await expect(caller.nexareply.workspace.createOrganization({ name: "New Workspace" })).resolves.toMatchObject({ id: 77, name: "New Workspace" });
    expect(create).toHaveBeenCalledWith(42, { name: "New Workspace" });
  });

  it("returns entitlements only after resolving the caller's organization membership scope", async () => {
    const memberScope = { organizationId: 1, role: "operator" as const, isDemo: false, actorUserId: 42 };
    const snapshot = { planCode: "starter-trial", subscriptionStatus: "trialing", aiAutomation: false, channels: 1, memberLimit: 2 };
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue(memberScope);
    const entitlements = vi.spyOn(nexareplyRepository, "getEntitlements").mockResolvedValue(snapshot as never);
    await expect(appRouter.createCaller(operatorContext()).nexareply.workspace.entitlements({ organizationId: 1 })).resolves.toEqual(snapshot);
    expect(entitlements).toHaveBeenCalledWith(memberScope);
  });

  it("forbids an operator before integration or membership data is read", async () => {
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue({ organizationId: 1, role: "operator", isDemo: false, actorUserId: 42 });
    const caller = appRouter.createCaller(operatorContext());
    await expect(caller.nexareply.workspace.owner.integrationStates({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.owner.meta.status({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.owner.meta.startOAuth({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.list({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.setRole({ organizationId: 1, userId: 99, role: "operator" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.invitations.list({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.invitations.create({ organizationId: 1, email: "new.operator@example.com" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.invitations.cancel({ organizationId: 1, invitationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.invitations.resend({ organizationId: 1, invitationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.imports.commit({ organizationId: 1, fileName: "catalog.csv", base64: "YQ==" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.assistant.update({ organizationId: 1, aiPersona: "უსაფრთხო გაყიდვების კონსულტანტი", aiTone: "თბილი და ზუსტი", replyLength: "normal", fallbackMessage: "ოპერატორი დაგიბრუნდებათ", autoReplyEnabled: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("forbids an owner from reading or mutating invitations in another organization", async () => {
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockImplementation(async (_userId, organizationId) => organizationId === 1 ? { organizationId: 1, role: "owner", isDemo: false, actorUserId: 42 } : null);
    const caller = appRouter.createCaller(operatorContext());
    await expect(caller.nexareply.workspace.memberships.invitations.list({ organizationId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.invitations.create({ organizationId: 2, email: "outside@example.com" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.invitations.cancel({ organizationId: 2, invitationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.memberships.invitations.resend({ organizationId: 2, invitationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});


describe("account deletion request boundaries", () => {
  it("forbids operators from creating or listing deletion requests", async () => {
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue({ organizationId: 1, role: "operator", isDemo: false, actorUserId: 42 });
    const caller = appRouter.createCaller(operatorContext());
    await expect(caller.nexareply.workspace.owner.accountDeletion.list({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.nexareply.workspace.owner.accountDeletion.request({ organizationId: 1, reason: "მონაცემების წაშლა" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates an owner request using authenticated email, not client-supplied identity", async () => {
    const scope = { organizationId: 8, role: "owner" as const, isDemo: false, actorUserId: 42 };
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue(scope);
    const create = vi.spyOn(nexareplyRepository, "createAccountDeletionRequest").mockResolvedValue({ id: 12, status: "requested", requestedAt: new Date(), duplicate: false });
    await expect(appRouter.createCaller(operatorContext()).nexareply.workspace.owner.accountDeletion.request({ organizationId: 8, reason: "დახურვა" })).resolves.toMatchObject({ id: 12, status: "requested" });
    expect(create).toHaveBeenCalledWith(scope, { requesterEmail: "operator@example.com", reason: "დახურვა" });
  });
});
