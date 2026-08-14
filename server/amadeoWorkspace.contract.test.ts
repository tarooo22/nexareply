import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getUserById: vi.fn(), updateLastSignedIn: vi.fn() }));

import * as db from "./db";
import { createContext } from "./_core/context";
import { createLocalSession } from "./customAuth";
import { metaMessengerService } from "./metaMessengerService";
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
});
