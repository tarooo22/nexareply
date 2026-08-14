import crypto from "node:crypto";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_INVITATION_BASE_URL = "https://nexareply-2chxuc4s.manus.space";

type InvitationEmailConfig = { apiKey: string; from: string; baseUrl: string };

function readEmailConfig(): InvitationEmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim() || "";
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "";
  const baseUrl = process.env.INVITATION_BASE_URL?.trim().replace(/\/$/, "") || "";
  return apiKey && from && baseUrl ? { apiKey, from, baseUrl } : null;
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function toOwnerInvitation(invitation: Awaited<ReturnType<typeof nexareplyRepository.createInvitation>>) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    deliveryStatus: invitation.deliveryStatus,
    expiresAt: invitation.expiresAt,
    sentAt: invitation.sentAt,
    acceptedAt: invitation.acceptedAt,
    cancelledAt: invitation.cancelledAt,
    createdAt: invitation.createdAt,
    lastError: invitation.lastError,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

async function deliverEmail(config: InvitationEmailConfig, input: { invitationId: number; email: string; organizationName: string; inviteLink: string; expiresAt: Date }) {
  const expires = input.expiresAt.toLocaleString("ka-GE", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `nexareply-invitation-${input.invitationId}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [input.email],
      subject: `მოწვევა: ${input.organizationName} · NexaReply`,
      text: `თქვენ მოწვეული ხართ ${input.organizationName}-ის NexaReply workspace-ში. მიიღეთ მოწვევა: ${input.inviteLink}\n\nბმული მოქმედებს: ${expires} UTC.`,
      html: `<p>თქვენ მოწვეული ხართ <strong>${escapeHtml(input.organizationName)}</strong>-ის NexaReply workspace-ში.</p><p><a href="${escapeHtml(input.inviteLink)}">მოწვევის მიღება</a></p><p>ბმული მოქმედებს: ${escapeHtml(expires)} UTC.</p>`,
    }),
  });
  const body = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message.slice(0, 500) : `Email provider returned ${response.status}`);
  return body.id ?? null;
}

export const invitationService = {
  emailConfigured() {
    return Boolean(readEmailConfig());
  },

  async listForOwner(scope: WorkspaceScope) {
    return (await nexareplyRepository.listInvitations(scope)).map(toOwnerInvitation);
  },

  async create(scope: WorkspaceScope, email: string) {
    const token = crypto.randomBytes(32).toString("base64url");
    const invitation = await nexareplyRepository.createInvitation(scope, { email: email.trim(), normalizedEmail: normalizedEmail(email), tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + INVITATION_TTL_MS) });
    const config = readEmailConfig();
    const fallbackBaseUrl = config?.baseUrl || process.env.INVITATION_BASE_URL?.trim().replace(/\/$/, "") || DEFAULT_INVITATION_BASE_URL;
    const inviteLink = `${fallbackBaseUrl}/invite/${token}`;
    const organization = await nexareplyRepository.getOrganization(scope);
    if (!config) return { invitation: toOwnerInvitation((await nexareplyRepository.setInvitationDelivery(scope, invitation.id, { status: "manual_ready" }))!), emailConfigured: false as const, inviteLink };
    try {
      const providerMessageId = await deliverEmail(config, { invitationId: invitation.id, email: invitation.email, organizationName: organization.name, inviteLink, expiresAt: invitation.expiresAt });
      return { invitation: toOwnerInvitation((await nexareplyRepository.setInvitationDelivery(scope, invitation.id, { status: "sent", providerMessageId }))!), emailConfigured: true as const, inviteLink: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email provider delivery failed.";
      return { invitation: toOwnerInvitation((await nexareplyRepository.setInvitationDelivery(scope, invitation.id, { status: "delivery_failed", lastError: message.slice(0, 500) }))!), emailConfigured: true as const, inviteLink };
    }
  },

  async cancel(scope: WorkspaceScope, invitationId: number) {
    return toOwnerInvitation(await nexareplyRepository.cancelInvitation(scope, invitationId));
  },

  async resend(scope: WorkspaceScope, invitationId: number) {
    const previous = await nexareplyRepository.getInvitation(scope, invitationId);
    if (!previous || previous.status !== "pending") throw new Error("Only a pending invitation can be resent.");
    await nexareplyRepository.addAudit(scope, "invitation.resend_requested", "organization_invitation", String(previous.id), { email: previous.normalizedEmail });
    return this.create(scope, previous.email);
  },

  async getPublicInvite(token: string) {
    const record = await nexareplyRepository.getInvitationByTokenHash(tokenHash(token));
    if (!record) return { status: "invalid" as const, organizationName: null, expiresAt: null };
    if (record.invitation.status !== "pending") return { status: record.invitation.status, organizationName: record.organization.name, expiresAt: record.invitation.expiresAt };
    return { status: "pending" as const, organizationName: record.organization.name, expiresAt: record.invitation.expiresAt };
  },

  async accept(token: string, user: { id: number; email?: string | null }) {
    if (!user.email?.trim()) throw new Error("თქვენს ანგარიშს დადასტურებული ელფოსტა არ აქვს. მიიღეთ მოწვევა შესაბამისი ელფოსტით ავტორიზებული ანგარიშით.");
    return nexareplyRepository.acceptInvitation({ tokenHash: tokenHash(token), userId: user.id, normalizedUserEmail: normalizedEmail(user.email) });
  },
};
