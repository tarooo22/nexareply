import type { User } from "../drizzle/schema";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getUserById: vi.fn(),
  updateLastSignedIn: vi.fn(),
}));

import * as db from "./db";
import { createContext } from "./_core/context";
import { createLocalSession } from "./customAuth";
import { invitationService } from "./invitationService";
import { metaMessengerService } from "./metaMessengerService";
import { nexareplyRepository } from "./nexareplyRepository";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";

const passwordUser: User = {
  id: 44,
  openId: "local_44",
  name: "Nexa Owner",
  email: "owner@example.com",
  normalizedEmail: "owner@example.com",
  passwordHash: "scrypt$test$hash",
  loginMethod: "password",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

async function contextForCookie(cookie?: string) {
  return createContext({
    req: { protocol: "https", headers: cookie ? { cookie } : {} },
    res: {},
  } as never);
}

async function contextForPasswordSession() {
  const token = await createLocalSession(passwordUser);
  return contextForCookie(`${COOKIE_NAME}=${token}`);
}

afterEach(() => vi.restoreAllMocks());

describe("custom password session integration", () => {
  it("permits a protected workspace call only after a persisted custom-session user is resolved", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(passwordUser);
    const validContext = await contextForPasswordSession();
    const organizations = [{ organizationId: 1, role: "owner", name: "Nexa Test" }];
    vi.spyOn(nexareplyRepository, "listOrganizationsForUser").mockResolvedValue(organizations as never);

    await expect(appRouter.createCaller(validContext).nexareply.workspace.organizations()).resolves.toEqual(organizations);
    expect(nexareplyRepository.listOrganizationsForUser).toHaveBeenCalledWith(44);

    const invalidContext = await contextForCookie(`${COOKIE_NAME}=invalid-session`);
    await expect(appRouter.createCaller(invalidContext).nexareply.workspace.organizations()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("enforces owner/operator permissions only after resolving the authenticated custom-session identity", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(passwordUser);
    const ownerContext = await contextForPasswordSession();
    const ownerScope = { organizationId: 1, role: "owner" as const, isDemo: false, actorUserId: 44 };
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue(ownerScope);
    vi.spyOn(metaMessengerService, "getConnectionStatus").mockResolvedValue({ kind: "unconfigured" } as never);

    await expect(appRouter.createCaller(ownerContext).nexareply.workspace.owner.meta.status({ organizationId: 1 })).resolves.toEqual({ kind: "unconfigured" });
    expect(nexareplyRepository.getWorkspaceScope).toHaveBeenCalledWith(44, 1);

    const operatorContext = await contextForPasswordSession();
    vi.mocked(nexareplyRepository.getWorkspaceScope).mockResolvedValue({ ...ownerScope, role: "operator" });
    await expect(appRouter.createCaller(operatorContext).nexareply.workspace.owner.meta.status({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(metaMessengerService.getConnectionStatus).toHaveBeenCalledTimes(1);
  });

  it("preserves owner-only membership listing and role mutation under a custom password session", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(passwordUser);
    const ownerContext = await contextForPasswordSession();
    const ownerScope = { organizationId: 1, role: "owner" as const, isDemo: false, actorUserId: 44 };
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue(ownerScope);
    vi.spyOn(nexareplyRepository, "listMemberships").mockResolvedValue([{ userId: 44, role: "owner" }] as never);
    vi.spyOn(nexareplyRepository, "setMembershipRole").mockResolvedValue({ userId: 99, role: "operator" } as never);

    const owner = appRouter.createCaller(ownerContext);
    await expect(owner.nexareply.workspace.memberships.list({ organizationId: 1 })).resolves.toEqual([{ userId: 44, role: "owner" }]);
    await expect(owner.nexareply.workspace.memberships.setRole({ organizationId: 1, userId: 99, role: "operator" })).resolves.toEqual({ userId: 99, role: "operator" });
    expect(nexareplyRepository.listMemberships).toHaveBeenCalledWith(ownerScope);
    expect(nexareplyRepository.setMembershipRole).toHaveBeenCalledWith(ownerScope, 99, "operator");

    const operatorContext = await contextForPasswordSession();
    vi.mocked(nexareplyRepository.getWorkspaceScope).mockResolvedValue({ ...ownerScope, role: "operator" });
    const operator = appRouter.createCaller(operatorContext);
    await expect(operator.nexareply.workspace.memberships.list({ organizationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(operator.nexareply.workspace.memberships.setRole({ organizationId: 1, userId: 99, role: "operator" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(nexareplyRepository.listMemberships).toHaveBeenCalledTimes(1);
    expect(nexareplyRepository.setMembershipRole).toHaveBeenCalledTimes(1);
  });

  it("preserves owner invitation-management actions under a custom password session", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(passwordUser);
    const context = await contextForPasswordSession();
    const ownerScope = { organizationId: 1, role: "owner" as const, isDemo: false, actorUserId: 44 };
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue(ownerScope);
    vi.spyOn(nexareplyRepository, "getEntitlements").mockResolvedValue({ planCode: "starter-trial", planName: "Starter Trial", subscriptionStatus: "trialing", trialEndsAt: new Date(Date.now() + 60_000), aiAutomation: false, monthlyAiReplies: 250, channels: 1, memberLimit: 2 } as never);
    vi.spyOn(nexareplyRepository, "listMemberships").mockResolvedValue([{ userId: 44, role: "owner" }] as never);
    vi.spyOn(invitationService, "listForOwner").mockResolvedValue([] as never);
    vi.spyOn(invitationService, "create").mockResolvedValue({ id: 7, state: "sent" } as never);
    vi.spyOn(invitationService, "cancel").mockResolvedValue({ id: 7, state: "cancelled" } as never);
    vi.spyOn(invitationService, "resend").mockResolvedValue({ id: 8, state: "sent" } as never);

    const owner = appRouter.createCaller(context);
    await expect(owner.nexareply.workspace.memberships.invitations.list({ organizationId: 1 })).resolves.toEqual([]);
    await expect(owner.nexareply.workspace.memberships.invitations.create({ organizationId: 1, email: "operator@example.com" })).resolves.toEqual({ id: 7, state: "sent" });
    await expect(owner.nexareply.workspace.memberships.invitations.cancel({ organizationId: 1, invitationId: 7 })).resolves.toEqual({ id: 7, state: "cancelled" });
    await expect(owner.nexareply.workspace.memberships.invitations.resend({ organizationId: 1, invitationId: 7 })).resolves.toEqual({ id: 8, state: "sent" });
    expect(invitationService.listForOwner).toHaveBeenCalledWith(ownerScope);
    expect(invitationService.create).toHaveBeenCalledWith(ownerScope, "operator@example.com");
    expect(invitationService.cancel).toHaveBeenCalledWith(ownerScope, 7);
    expect(invitationService.resend).toHaveBeenCalledWith(ownerScope, 7);
  });

  it("passes the custom-session user to invitation acceptance and owner-scoped Page selection without exposing provider credentials", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(passwordUser);
    const context = await contextForPasswordSession();
    const token = "i".repeat(40);
    const sessionId = "s".repeat(20);
    const ownerScope = { organizationId: 1, role: "owner" as const, isDemo: false, actorUserId: 44 };
    vi.spyOn(invitationService, "accept").mockResolvedValue({ organizationId: 1, role: "operator" } as never);
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue(ownerScope);
    vi.spyOn(metaMessengerService, "selectPage").mockResolvedValue({ kind: "connected", pageId: "page-1", pageName: "Nexa Page" } as never);

    await expect(appRouter.createCaller(context).nexareply.invitations.accept({ token })).resolves.toEqual({ organizationId: 1, role: "operator" });
    expect(invitationService.accept).toHaveBeenCalledWith(token, expect.objectContaining({ id: 44, loginMethod: "password" }));

    const selected = await appRouter.createCaller(context).nexareply.workspace.owner.meta.selectPage({ organizationId: 1, sessionId, pageId: "page-1" });
    expect(selected).toEqual({ kind: "connected", pageId: "page-1", pageName: "Nexa Page" });
    expect(JSON.stringify(selected)).not.toMatch(/access.?token|app.?secret|provider.?token/i);
    expect(metaMessengerService.selectPage).toHaveBeenCalledWith(ownerScope, { organizationId: 1, sessionId, pageId: "page-1" });
  });
});
