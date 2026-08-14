import { afterEach, describe, expect, it, vi } from "vitest";
import { requireEntitlement, requireMemberCapacity } from "./entitlementService";
import { nexareplyRepository, type EntitlementSnapshot, type WorkspaceScope } from "./nexareplyRepository";

const scope: WorkspaceScope = { organizationId: 42, role: "owner", isDemo: false, actorUserId: 7 };
const active: EntitlementSnapshot = {
  planCode: "starter-trial",
  planName: "Starter Trial",
  subscriptionStatus: "trialing",
  trialEndsAt: new Date(Date.now() + 60_000),
  aiAutomation: false,
  monthlyAiReplies: 250,
  channels: 1,
  memberLimit: 2,
};

afterEach(() => vi.restoreAllMocks());

describe("server-side tenant entitlements", () => {
  it("rejects channel and automation actions when the organization plan disallows them", async () => {
    vi.spyOn(nexareplyRepository, "getEntitlements").mockResolvedValue({ ...active, channels: 0, aiAutomation: false });
    await expect(requireEntitlement(scope, "meta_channel")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireEntitlement(scope, "ai_automation")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects member additions at the organization-scoped plan limit", async () => {
    vi.spyOn(nexareplyRepository, "getEntitlements").mockResolvedValue(active);
    vi.spyOn(nexareplyRepository, "listMemberships").mockResolvedValue([{ membership: { id: 1 }, user: { id: 7 } }, { membership: { id: 2 }, user: { id: 8 } }] as never);
    await expect(requireMemberCapacity(scope)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects expired subscription actions before any tenant side effect", async () => {
    vi.spyOn(nexareplyRepository, "getEntitlements").mockResolvedValue({ ...active, subscriptionStatus: "expired" });
    await expect(requireEntitlement(scope, "member")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
