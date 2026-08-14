import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getUserById: vi.fn(), updateLastSignedIn: vi.fn() }));

import * as db from "./db";
import { createContext } from "./_core/context";
import { createLocalSession } from "./customAuth";
import { metaMessengerService } from "./metaMessengerService";
import { knowledgeDraftService } from "./knowledgeDraftService";
import { nexareplyRepository } from "./nexareplyRepository";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";

const user: User = { id: 818, openId: "local_818", name: "Amadeo Owner", email: "amadeo-owner@example.com", normalizedEmail: "amadeo-owner@example.com", passwordHash: "scrypt$test$hash", loginMethod: "password", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const scope = { organizationId: 7001, role: "owner" as const, isDemo: false, actorUserId: user.id };

async function caller() {
  vi.mocked(db.getUserById).mockResolvedValue(user);
  vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue(scope);
  const token = await createLocalSession(user);
  const context = await createContext({ req: { protocol: "https", headers: { cookie: `${COOKIE_NAME}=${token}` } }, res: {} } as never);
  return appRouter.createCaller(context);
}

afterEach(() => vi.restoreAllMocks());

describe("Amadeo workspace response contracts", () => {
  it("returns secret-safe knowledge, inbox, alerts, ticket and analytics DTOs", async () => {
    const api = await caller();
    vi.spyOn(nexareplyRepository, "listKnowledgeFacts").mockResolvedValue([{ id: 1, title: "მიწოდება", body: "დადასტურებული წესი", category: "delivery", active: true, createdAt: new Date(), updatedAt: new Date(), accessToken: "never-return" }] as never);
    vi.spyOn(nexareplyRepository, "listConversations").mockResolvedValue([{ id: 3, leadId: 6, customerName: "ანა", customerPhone: "+995500000000", status: "open", humanActive: false, aiState: "active", priority: "normal", preview: "Rose Amber", preferredProduct: "Rose Amber", lastInboundAt: new Date(), lastMessageAt: new Date(), createdAt: new Date(), updatedAt: new Date(), providerToken: "never-return" }] as never);
    vi.spyOn(nexareplyRepository, "listMessages").mockResolvedValue([{ id: 5, conversationId: 3, sender: "customer", body: "ფასი?", source: "meta", isDraft: false, deliveryStatus: "received", approvedAt: null, createdAt: new Date(), inboundEventId: "not-public" }] as never);
    vi.spyOn(nexareplyRepository, "listNotifications").mockResolvedValue([{ id: 8, type: "needs_human", title: "უცნობი კითხვა", body: "ოპერატორის ჩართვა", relatedConversationId: 3, readAt: null, createdAt: new Date(), dedupeKey: "not-public" }] as never);
    vi.spyOn(nexareplyRepository, "listTickets").mockResolvedValue([{ ticket: { id: 9, conversationId: 3, reason: "unknown", status: "open", priority: "high", createdAt: new Date(), updatedAt: new Date(), idempotencyKey: "not-public" }, conversation: { id: 3, customerName: "ანა", customerPhone: "+995500000000", status: "pending", humanActive: false, aiState: "needs_human", priority: "high", preview: "Rose Amber", preferredProduct: "Rose Amber", createdAt: new Date(), updatedAt: new Date(), accessToken: "never-return" } }] as never);
    vi.spyOn(nexareplyRepository, "getAnalytics").mockResolvedValue({ conversationCount: 1, aiReplies: 2, humanReplies: 1, qualifiedLeads: 1, handoffs: 1, draftOrderCount: 0, responseRate: 0.7, dailyVolume: [{ day: "ორშ", ai: 2, human: 1 }], providerToken: "never-return" } as never);

    const [knowledge, conversations, messages, alerts, tickets, analytics] = await Promise.all([
      api.nexareply.workspace.knowledge.list({ organizationId: scope.organizationId }), api.nexareply.workspace.conversations.list({ organizationId: scope.organizationId }), api.nexareply.workspace.conversations.messages({ organizationId: scope.organizationId, conversationId: 3 }), api.nexareply.workspace.notifications.list({ organizationId: scope.organizationId }), api.nexareply.workspace.tickets.list({ organizationId: scope.organizationId, status: "open" }), api.nexareply.workspace.analytics({ organizationId: scope.organizationId }),
    ]);
    expect(knowledge[0]).toMatchObject({ title: "მიწოდება", category: "delivery" });
    expect(conversations[0]).toMatchObject({ customerName: "ანა", preferredProduct: "Rose Amber" });
    expect(messages[0]).toMatchObject({ deliveryStatus: "received", source: "meta" });
    expect(alerts[0]).toMatchObject({ type: "needs_human", relatedConversationId: 3 });
    expect(tickets[0].ticket).toMatchObject({ reason: "unknown", priority: "high" });
    expect(analytics).toEqual(expect.objectContaining({ conversationCount: 1, dailyVolume: [{ day: "ორშ", ai: 2, human: 1 }] }));
    expect(JSON.stringify({ knowledge, conversations, messages, alerts, tickets, analytics })).not.toMatch(/access.?token|app.?secret|provider.?token|dedupe.?key|inbound.?event/i);
  });

  it("supports assistant/knowledge/ticket actions and persists sent or failed inbox delivery states", async () => {
    const api = await caller();
    vi.spyOn(nexareplyRepository, "getOrganization").mockResolvedValue({ aiPersona: "Amadeo სუნამოების კონსულტანტი", aiTone: "თბილი", replyLength: "normal", fallbackMessage: "გადავამოწმებ", accessToken: "never-return" } as never);
    vi.spyOn(nexareplyRepository, "updateAssistantSettings").mockResolvedValue({ aiPersona: "ზუსტი კონსულტანტი", aiTone: "მშვიდი", replyLength: "short", fallbackMessage: "ticket გაიხსნება", appSecret: "never-return" } as never);
    vi.spyOn(nexareplyRepository, "createKnowledgeFact").mockResolvedValue({ id: 11 } as never);
    vi.spyOn(nexareplyRepository, "updateKnowledgeFact").mockResolvedValue({ id: 11 } as never);
    vi.spyOn(nexareplyRepository, "deleteKnowledgeFact").mockResolvedValue({ id: 11 } as never);
    vi.spyOn(nexareplyRepository, "resolveTicket").mockResolvedValue({ id: 9, status: "resolved" } as never);
    const addMessage = vi.spyOn(nexareplyRepository, "addMessage").mockResolvedValue(undefined as never);
    vi.spyOn(nexareplyRepository, "getCustomerParticipant").mockResolvedValue(null);

    await expect(api.nexareply.workspace.assistant.settings({ organizationId: scope.organizationId })).resolves.toEqual({ aiPersona: "Amadeo სუნამოების კონსულტანტი", aiTone: "თბილი", replyLength: "normal", fallbackMessage: "გადავამოწმებ" });
    await expect(api.nexareply.workspace.assistant.update({ organizationId: scope.organizationId, aiPersona: "ზუსტი კონსულტანტი", aiTone: "მშვიდი", replyLength: "short", fallbackMessage: "ticket გაიხსნება" })).resolves.toEqual({ aiPersona: "ზუსტი კონსულტანტი", aiTone: "მშვიდი", replyLength: "short", fallbackMessage: "ticket გაიხსნება" });
    await api.nexareply.workspace.knowledge.create({ organizationId: scope.organizationId, title: "დაბრუნება", body: "დადასტურებული წესი", category: "returns" });
    await api.nexareply.workspace.knowledge.update({ organizationId: scope.organizationId, id: 11, title: "დაბრუნება", body: "განახლებული წესი", category: "returns" });
    await api.nexareply.workspace.knowledge.archive({ organizationId: scope.organizationId, id: 11 });
    await api.nexareply.workspace.tickets.resolve({ organizationId: scope.organizationId, ticketId: 9 });
    await expect(api.nexareply.workspace.conversations.sendReply({ organizationId: scope.organizationId, conversationId: 3, body: "ამჟამად ვაზუსტებ." })).resolves.toEqual({ delivered: false, channel: "workspace" });
    expect(addMessage).toHaveBeenLastCalledWith(scope, expect.objectContaining({ deliveryStatus: "sent" }));

    vi.mocked(nexareplyRepository.getCustomerParticipant).mockResolvedValue({ externalId: "meta:psid-1" } as never);
    vi.spyOn(metaMessengerService, "sendText").mockResolvedValue({ delivered: false, error: "Meta delivery failed" });
    await expect(api.nexareply.workspace.conversations.sendReply({ organizationId: scope.organizationId, conversationId: 3, body: "ვერ გაეგზავნა." })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(addMessage).toHaveBeenLastCalledWith(scope, expect.objectContaining({ deliveryStatus: "failed" }));
  });

  it("returns sanitized customer context, validated draft evidence and an idempotent operator handoff ticket", async () => {
    const api = await caller();
    vi.spyOn(nexareplyRepository, "getConversationContext").mockResolvedValue({
      conversation: { id: 3, leadId: 6, customerName: "ანა", customerPhone: "+995500000000", status: "pending", humanActive: false, aiState: "needs_human", priority: "high", preview: "ორიგინალია?", preferredProduct: "Rose Amber", lastInboundAt: new Date(), lastMessageAt: new Date(), createdAt: new Date(), updatedAt: new Date(), providerToken: "never-return" },
      participant: { displayName: "ანა", externalId: "meta:private-psid" },
      activeTicket: { id: 44, reason: "უცნობი კითხვა", status: "open", priority: "high", createdAt: new Date(), idempotencyKey: "never-return" },
    } as never);
    vi.spyOn(nexareplyRepository, "listMessages").mockResolvedValue([{ id: 5, conversationId: 3, sender: "ai", body: "დადასტურებული პასუხი", source: "ai", isDraft: true, draftEvidence: [{ kind: "knowledge", label: "ორიგინალობა", detail: "authenticity" }, { kind: "unsafe", label: "must-not-return" }], deliveryStatus: "draft", approvedAt: null, createdAt: new Date() }] as never);
    const createTicket = vi.spyOn(nexareplyRepository, "createTicketOnce").mockResolvedValue({ id: 45, status: "open", priority: "high" } as never);
    const notify = vi.spyOn(nexareplyRepository, "createNotificationOnce").mockResolvedValue({ id: 17 } as never);

    const [context, messages, handoff] = await Promise.all([
      api.nexareply.workspace.conversations.context({ organizationId: scope.organizationId, conversationId: 3 }),
      api.nexareply.workspace.conversations.messages({ organizationId: scope.organizationId, conversationId: 3 }),
      api.nexareply.workspace.conversations.handoff({ organizationId: scope.organizationId, conversationId: 3, reason: "ფასის დადასტურება", priority: "high" }),
    ]);

    expect(context).toMatchObject({ customer: { displayName: "ანა", hasMessengerIdentity: true }, activeTicket: { id: 44, priority: "high" } });
    expect(messages[0].draftEvidence).toEqual([{ kind: "knowledge", label: "ორიგინალობა", detail: "authenticity" }]);
    expect(handoff).toEqual({ id: 45, status: "open", priority: "high" });
    expect(createTicket).toHaveBeenCalledWith(scope, 3, "ფასის დადასტურება", "high", expect.stringContaining("operator_handoff:3:"));
    expect(notify).toHaveBeenCalledWith(scope, expect.objectContaining({ relatedConversationId: 3, type: "needs_human" }));
    expect(JSON.stringify({ context, messages, handoff })).not.toMatch(/external.?id|private.?psid|provider.?token|idempotency.?key|must-not-return/i);
  });

  it("returns real onboarding readiness signals and supports owner checklist presentation controls", async () => {
    const api = await caller();
    const onboarding = {
      dismissedAt: null,
      assistantReviewedAt: null,
      workerReady: false,
      completedCount: 2,
      totalActionableSteps: 5,
      steps: { channelConnected: true, knowledgeReady: true, catalogReady: false, assistantReviewed: false, testDraftReady: false },
    };
    vi.spyOn(nexareplyRepository, "getOnboarding").mockResolvedValue(onboarding as never);
    const dismiss = vi.spyOn(nexareplyRepository, "dismissOnboarding").mockResolvedValue({ ...onboarding, dismissedAt: new Date() } as never);
    const restart = vi.spyOn(nexareplyRepository, "restartOnboarding").mockResolvedValue(onboarding as never);

    await expect(api.nexareply.workspace.onboarding.state({ organizationId: scope.organizationId })).resolves.toEqual(onboarding);
    await api.nexareply.workspace.onboarding.dismiss({ organizationId: scope.organizationId });
    await api.nexareply.workspace.onboarding.restart({ organizationId: scope.organizationId });

    expect(dismiss).toHaveBeenCalledWith(scope);
    expect(restart).toHaveBeenCalledWith(scope);
  });

  it("returns product gallery metadata without leaking object-storage keys", async () => {
    const api = await caller();
    vi.spyOn(nexareplyRepository, "listProductAssets").mockResolvedValue([{ id: 12, organizationId: scope.organizationId, productId: 5, storageKey: "organizations/7001/products/5/private-object.png", mimeType: "image/png", byteSize: 2048, width: 640, height: 640, altText: "Rose Amber", sortOrder: 0, isPrimary: true, createdAt: new Date(), updatedAt: new Date() }] as never);
    const assets = await api.nexareply.workspace.products.assets.list({ organizationId: scope.organizationId, productId: 5 });
    expect(assets[0]).toMatchObject({ id: 12, productId: 5, mimeType: "image/png", isPrimary: true, url: "/manus-storage/organizations/7001/products/5/private-object.png" });
    expect(JSON.stringify(assets)).not.toContain("storageKey");
  });

  it("keeps generated knowledge as owner-approved drafts before active facts are created", async () => {
    const api = await caller();
    const generated = vi.spyOn(knowledgeDraftService, "generate").mockResolvedValue({ id: 41, status: "draft" } as never);
    vi.spyOn(nexareplyRepository, "listKnowledgeDrafts").mockResolvedValue([{ source: { id: 41, title: "წესები", originalText: "მიწოდება ხელმისაწვდომია", status: "draft", version: 1, createdAt: new Date(), updatedAt: new Date() }, draft: { id: 61, sourceId: 41, title: "მიწოდება", body: "მიწოდება ხელმისაწვდომია", category: "delivery", confidence: 90, status: "pending", approvedKnowledgeFactId: null, reviewedAt: null, createdAt: new Date(), updatedAt: new Date() } }] as never);
    const approve = vi.spyOn(nexareplyRepository, "approveKnowledgeDrafts").mockResolvedValue([] as never);
    const reject = vi.spyOn(nexareplyRepository, "rejectKnowledgeDraft").mockResolvedValue(undefined as never);

    await expect(api.nexareply.workspace.knowledge.drafts.generate({ organizationId: scope.organizationId, title: "წესები", originalText: "Amadeo-ის მიწოდების პირობები დადასტურებულია." })).resolves.toMatchObject({ id: 41, status: "draft" });
    const pending = await api.nexareply.workspace.knowledge.drafts.list({ organizationId: scope.organizationId });
    await api.nexareply.workspace.knowledge.drafts.approve({ organizationId: scope.organizationId, sourceId: 41, draftIds: [61] });
    await api.nexareply.workspace.knowledge.drafts.reject({ organizationId: scope.organizationId, draftId: 61 });

    expect(generated).toHaveBeenCalledWith(scope, expect.objectContaining({ originalText: expect.stringContaining("მიწოდების") }));
    expect(pending[0].draft).toMatchObject({ id: 61, status: "pending", category: "delivery" });
    expect(approve).toHaveBeenCalledWith(scope, 41, [61]);
    expect(reject).toHaveBeenCalledWith(scope, 61);
  });
});
