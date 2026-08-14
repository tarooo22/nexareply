import { afterEach, describe, expect, it, vi } from "vitest";
import { invitationService } from "./invitationService";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";

const scope: WorkspaceScope = { organizationId: 12, role: "owner", isDemo: false, actorUserId: 34 };
const emailKeys = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "INVITATION_BASE_URL"] as const;
const originalEnv = Object.fromEntries(emailKeys.map((key) => [key, process.env[key]]));
const invitationRecord = {
  id: 77,
  email: "operator@example.com",
  normalizedEmail: "operator@example.com",
  role: "operator",
  status: "pending",
  deliveryStatus: "manual_ready",
  expiresAt: new Date("2026-08-21T00:00:00.000Z"),
  sentAt: null,
  acceptedAt: null,
  cancelledAt: null,
  createdAt: new Date("2026-08-14T00:00:00.000Z"),
  lastError: null,
  tokenHash: "server-only-hash",
  activeEmailKey: "12:operator@example.com",
};

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of emailKeys) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("organization invitation service", () => {
  it("uses a one-time manual-link fallback without exposing the persisted token hash", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.INVITATION_BASE_URL;
    vi.spyOn(nexareplyRepository, "createInvitation").mockResolvedValue(invitationRecord as never);
    vi.spyOn(nexareplyRepository, "setInvitationDelivery").mockResolvedValue(invitationRecord as never);
    vi.spyOn(nexareplyRepository, "getOrganization").mockResolvedValue({ name: "TechZone" } as never);
    const response = await invitationService.create(scope, "operator@example.com");
    expect(response).toMatchObject({ emailConfigured: false, invitation: { id: 77, email: "operator@example.com", status: "pending", deliveryStatus: "manual_ready" } });
    expect(response.inviteLink).toMatch(/^https:\/\/nexareply-2chxuc4s\.manus\.space\/invite\//);
    expect(JSON.stringify(response)).not.toMatch(/tokenHash|server-only-hash|secret/i);
  });

  it("records a safe delivery-failed state when configured email provider rejects a message", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "NexaReply <invites@example.com>";
    process.env.INVITATION_BASE_URL = "https://example.test";
    vi.spyOn(nexareplyRepository, "createInvitation").mockResolvedValue(invitationRecord as never);
    vi.spyOn(nexareplyRepository, "getOrganization").mockResolvedValue({ name: "TechZone" } as never);
    const setDelivery = vi.spyOn(nexareplyRepository, "setInvitationDelivery").mockResolvedValue({ ...invitationRecord, deliveryStatus: "delivery_failed", lastError: "Provider rejected" } as never);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: "Provider rejected" }) }));
    const response = await invitationService.create(scope, "operator@example.com");
    expect(response).toMatchObject({ emailConfigured: true, invitation: { deliveryStatus: "delivery_failed", lastError: "Provider rejected" } });
    expect(response.inviteLink).toMatch(/^https:\/\/example\.test\/invite\//);
    expect(setDelivery).toHaveBeenCalledWith(scope, 77, expect.objectContaining({ status: "delivery_failed" }));
  });

  it("accepts only through a logged-in account with a matching email and passes only a token hash to persistence", async () => {
    const accept = vi.spyOn(nexareplyRepository, "acceptInvitation").mockResolvedValue({ organizationId: 12, organizationName: "TechZone", role: "operator", invitationId: 77, alreadyMember: false });
    await expect(invitationService.accept("bearer-token-value", { id: 99, email: "OPERATOR@example.com" })).resolves.toMatchObject({ organizationId: 12, role: "operator" });
    expect(accept).toHaveBeenCalledWith(expect.objectContaining({ userId: 99, normalizedUserEmail: "operator@example.com", tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    await expect(invitationService.accept("bearer-token-value", { id: 99, email: null })).rejects.toThrow("დადასტურებული ელფოსტა");
  });

  it("returns only public organization/status metadata for an invite preview", async () => {
    vi.spyOn(nexareplyRepository, "getInvitationByTokenHash").mockResolvedValue({ invitation: invitationRecord, organization: { name: "TechZone" } } as never);
    const preview = await invitationService.getPublicInvite("bearer-token-value");
    expect(preview).toEqual({ status: "pending", organizationName: "TechZone", expiresAt: invitationRecord.expiresAt });
    expect(JSON.stringify(preview)).not.toMatch(/email|token|hash|secret/i);
  });

  it("replaces a pending invitation on resend before generating a new one-time link", async () => {
    vi.spyOn(nexareplyRepository, "getInvitation").mockResolvedValue(invitationRecord as never);
    const audit = vi.spyOn(nexareplyRepository, "addAudit").mockResolvedValue(undefined);
    const create = vi.spyOn(invitationService, "create").mockResolvedValue({ invitation: { id: 78, email: "operator@example.com" } as never, emailConfigured: false, inviteLink: "https://example.test/invite/new-token" });
    await expect(invitationService.resend(scope, 77)).resolves.toMatchObject({ inviteLink: "https://example.test/invite/new-token" });
    expect(audit).toHaveBeenCalledWith(scope, "invitation.resend_requested", "organization_invitation", "77", expect.any(Object));
    expect(create).toHaveBeenCalledWith(scope, "operator@example.com");
  });

  it("reports expired invitations as unusable and rejects replay after an invitation has been accepted", async () => {
    vi.spyOn(nexareplyRepository, "getInvitationByTokenHash").mockResolvedValue({ invitation: { ...invitationRecord, status: "expired" }, organization: { name: "TechZone" } } as never);
    await expect(invitationService.getPublicInvite("expired-token-value")).resolves.toMatchObject({ status: "expired", organizationName: "TechZone" });
    const accept = vi.spyOn(nexareplyRepository, "acceptInvitation")
      .mockResolvedValueOnce({ organizationId: 12, organizationName: "TechZone", role: "operator", invitationId: 77, alreadyMember: false })
      .mockRejectedValueOnce(new Error("Invitation is invalid or has expired."));
    await expect(invitationService.accept("single-use-token", { id: 99, email: "operator@example.com" })).resolves.toMatchObject({ invitationId: 77 });
    await expect(invitationService.accept("single-use-token", { id: 99, email: "operator@example.com" })).rejects.toThrow("invalid or has expired");
    expect(accept).toHaveBeenCalledTimes(2);
  });
});
