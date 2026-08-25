import { afterEach, describe, expect, it, vi } from "vitest";
import { processSafeAutoReply } from "./demoAiService";
import { metaMessengerService } from "./metaMessengerService";
import { nexareplyRepository } from "./nexareplyRepository";

const scope = { organizationId: 61, role: "owner" as const, isDemo: true, actorUserId: 5 };
const activeConversation = { id: 22, organizationId: 61, customerName: "ანა", humanActive: false, aiState: "active", priority: "normal", preferredProduct: null };
const customerMessage = { id: 11, sender: "customer", body: "Rose Amber ფასი?" };

afterEach(() => vi.restoreAllMocks());

function mockKnownReply(autoReplyEnabled: boolean) {
  vi.spyOn(nexareplyRepository, "getConversation").mockResolvedValue(activeConversation as never);
  vi.spyOn(nexareplyRepository, "listMessages").mockResolvedValue([customerMessage] as never);
  vi.spyOn(nexareplyRepository, "getOrganization").mockResolvedValue({ autoReplyEnabled, fallbackMessage: "ოპერატორი დაგიბრუნდებათ" } as never);
  vi.spyOn(nexareplyRepository, "listCatalogFacts").mockResolvedValue([{ product: { id: 7, brand: "Amadeo", model: "Rose Amber", description: "ხის და ქარვის ნოტები" }, variant: { id: 9, stock: 3, color: "მარაგშია", storage: "50 ml", priceGel: "49" } }] as never);
  vi.spyOn(nexareplyRepository, "addAudit").mockResolvedValue(undefined as never);
}

describe("safe automatic reply", () => {
  it("sends only a grounded catalog answer when the owner setting is enabled", async () => {
    mockKnownReply(true);
    vi.spyOn(nexareplyRepository, "getCustomerParticipant").mockResolvedValue({ externalId: "meta:psid-22" } as never);
    const reserve = vi.spyOn(nexareplyRepository, "reserveAutomatedReply").mockResolvedValue({ created: true, message: { id: 90, deliveryStatus: "queued" } } as never);
    const delivery = vi.spyOn(metaMessengerService, "sendText").mockResolvedValue({ delivered: true, status: "connected", messageId: "mid.90" } as never);
    const setDelivery = vi.spyOn(nexareplyRepository, "setAutomatedReplyDelivery").mockResolvedValue(undefined as never);

    await expect(processSafeAutoReply(scope, { conversationId: 22, inboundEventId: "mid.inbound.22" })).resolves.toEqual({ status: "sent", source: "catalog" });

    expect(reserve).toHaveBeenCalledWith(scope, expect.objectContaining({ conversationId: 22, automationEventId: "mid.inbound.22", draftEvidence: [expect.objectContaining({ kind: "catalog" })] }));
    expect(delivery).toHaveBeenCalledWith(scope, expect.objectContaining({ psid: "psid-22", text: expect.stringContaining("Amadeo Rose Amber") }));
    expect(setDelivery).toHaveBeenCalledWith(scope, 90, "sent");
    expect(nexareplyRepository.addAudit).toHaveBeenCalledWith(scope, "ai.auto_reply_sent", "conversation", "22", expect.objectContaining({ automationEventId: "mid.inbound.22", source: "catalog" }));
  });

  it("keeps the existing approval workflow when the owner setting is disabled", async () => {
    mockKnownReply(false);
    const draft = vi.spyOn(nexareplyRepository, "addMessage").mockResolvedValue(undefined as never);
    const send = vi.spyOn(metaMessengerService, "sendText");

    await expect(processSafeAutoReply(scope, { conversationId: 22, inboundEventId: "mid.inbound.23" })).resolves.toEqual({ status: "draft", source: "catalog" });

    expect(draft).toHaveBeenCalledWith(scope, expect.objectContaining({ sender: "ai", isDraft: true, source: "ai" }));
    expect(send).not.toHaveBeenCalled();
  });

  it("never sends an unknown question and instead creates the existing ticket, alert and AI pause", async () => {
    vi.spyOn(nexareplyRepository, "getConversation").mockResolvedValue(activeConversation as never);
    vi.spyOn(nexareplyRepository, "listMessages").mockResolvedValue([{ id: 12, sender: "customer", body: "ხვალინდელი შეკვეთიდან დამირეკავთ?" }] as never);
    vi.spyOn(nexareplyRepository, "getOrganization").mockResolvedValue({ autoReplyEnabled: true, fallbackMessage: "ოპერატორი დაგიბრუნდებათ" } as never);
    vi.spyOn(nexareplyRepository, "listCatalogFacts").mockResolvedValue([] as never);
    vi.spyOn(nexareplyRepository, "listKnowledgeFacts").mockResolvedValue([] as never);
    const add = vi.spyOn(nexareplyRepository, "addMessage").mockResolvedValue(undefined as never);
    const ticket = vi.spyOn(nexareplyRepository, "createTicketOnce").mockResolvedValue({ id: 13 } as never);
    const notice = vi.spyOn(nexareplyRepository, "createNotificationOnce").mockResolvedValue({ id: 14 } as never);
    const pause = vi.spyOn(nexareplyRepository, "pauseAiForNeedsHuman").mockResolvedValue(undefined as never);
    vi.spyOn(nexareplyRepository, "addAudit").mockResolvedValue(undefined as never);
    const send = vi.spyOn(metaMessengerService, "sendText");

    await expect(processSafeAutoReply(scope, { conversationId: 22, inboundEventId: "mid.inbound.24" })).resolves.toEqual({ status: "needs_human", source: "fallback" });

    expect(add).toHaveBeenCalledWith(scope, expect.objectContaining({ isDraft: true, draftEvidence: [expect.objectContaining({ kind: "fallback" })] }));
    expect(ticket).toHaveBeenCalledWith(scope, 22, "unknown_question", "normal", "needs_human:22");
    expect(notice).toHaveBeenCalledWith(scope, expect.objectContaining({ type: "needs_human", relatedConversationId: 22 }));
    expect(pause).toHaveBeenCalledWith(scope, 22);
    expect(send).not.toHaveBeenCalled();
  });

  it("cancels a reserved answer when an operator takes over immediately before delivery", async () => {
    mockKnownReply(true);
    vi.spyOn(nexareplyRepository, "getConversation")
      .mockResolvedValueOnce(activeConversation as never)
      .mockResolvedValueOnce(activeConversation as never)
      .mockResolvedValueOnce({ ...activeConversation, humanActive: true, aiState: "paused" } as never);
    vi.spyOn(nexareplyRepository, "getCustomerParticipant").mockResolvedValue({ externalId: "meta:psid-22" } as never);
    vi.spyOn(nexareplyRepository, "reserveAutomatedReply").mockResolvedValue({ created: true, message: { id: 91, deliveryStatus: "queued" } } as never);
    const setDelivery = vi.spyOn(nexareplyRepository, "setAutomatedReplyDelivery").mockResolvedValue(undefined as never);
    const send = vi.spyOn(metaMessengerService, "sendText");

    await expect(processSafeAutoReply(scope, { conversationId: 22, inboundEventId: "mid.inbound.25" })).resolves.toMatchObject({ status: "blocked" });

    expect(setDelivery).toHaveBeenCalledWith(scope, 91, "failed");
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send a second message for a duplicate automation event", async () => {
    mockKnownReply(true);
    vi.spyOn(nexareplyRepository, "getCustomerParticipant").mockResolvedValue({ externalId: "meta:psid-22" } as never);
    vi.spyOn(nexareplyRepository, "reserveAutomatedReply").mockResolvedValue({ created: false, message: { id: 92, deliveryStatus: "sent" } } as never);
    const send = vi.spyOn(metaMessengerService, "sendText");

    await expect(processSafeAutoReply(scope, { conversationId: 22, inboundEventId: "mid.inbound.26" })).resolves.toEqual({ status: "duplicate", deliveryStatus: "sent" });

    expect(send).not.toHaveBeenCalled();
  });

  it("turns a stranded queued duplicate into an owner-visible handoff instead of risking a second send", async () => {
    mockKnownReply(true);
    vi.spyOn(nexareplyRepository, "getCustomerParticipant").mockResolvedValue({ externalId: "meta:psid-22" } as never);
    vi.spyOn(nexareplyRepository, "reserveAutomatedReply").mockResolvedValue({ created: false, message: { id: 94, deliveryStatus: "queued" } } as never);
    const setDelivery = vi.spyOn(nexareplyRepository, "setAutomatedReplyDelivery").mockResolvedValue(undefined as never);
    const ticket = vi.spyOn(nexareplyRepository, "createTicketOnce").mockResolvedValue({ id: 17 } as never);
    const notice = vi.spyOn(nexareplyRepository, "createNotificationOnce").mockResolvedValue({ id: 18 } as never);
    const pause = vi.spyOn(nexareplyRepository, "pauseAiForNeedsHuman").mockResolvedValue(undefined as never);
    const send = vi.spyOn(metaMessengerService, "sendText");

    await expect(processSafeAutoReply(scope, { conversationId: 22, inboundEventId: "mid.inbound.queued" })).resolves.toEqual({ status: "needs_human", source: "recovery_required" });

    expect(setDelivery).toHaveBeenCalledWith(scope, 94, "failed");
    expect(ticket).toHaveBeenCalledWith(scope, 22, "auto_reply_delivery_failed", "normal", "auto_reply_delivery_failed:mid.inbound.queued");
    expect(notice).toHaveBeenCalledWith(scope, expect.objectContaining({ type: "delivery_failed" }));
    expect(pause).toHaveBeenCalledWith(scope, 22);
    expect(send).not.toHaveBeenCalled();
  });

  it("records a delivery failure, opens a recovery ticket and pauses AI instead of retrying an unsafe send", async () => {
    mockKnownReply(true);
    vi.spyOn(nexareplyRepository, "getCustomerParticipant").mockResolvedValue({ externalId: "meta:psid-22" } as never);
    vi.spyOn(nexareplyRepository, "reserveAutomatedReply").mockResolvedValue({ created: true, message: { id: 93, deliveryStatus: "queued" } } as never);
    vi.spyOn(metaMessengerService, "sendText").mockResolvedValue({ delivered: false, status: "delivery_failed", error: "Meta message delivery failed." } as never);
    const setDelivery = vi.spyOn(nexareplyRepository, "setAutomatedReplyDelivery").mockResolvedValue(undefined as never);
    const ticket = vi.spyOn(nexareplyRepository, "createTicketOnce").mockResolvedValue({ id: 15 } as never);
    const notice = vi.spyOn(nexareplyRepository, "createNotificationOnce").mockResolvedValue({ id: 16 } as never);
    const pause = vi.spyOn(nexareplyRepository, "pauseAiForNeedsHuman").mockResolvedValue(undefined as never);

    await expect(processSafeAutoReply(scope, { conversationId: 22, inboundEventId: "mid.inbound.27" })).resolves.toEqual({ status: "needs_human", source: "delivery_failed" });

    expect(setDelivery).toHaveBeenCalledWith(scope, 93, "failed");
    expect(ticket).toHaveBeenCalledWith(scope, 22, "auto_reply_delivery_failed", "normal", "auto_reply_delivery_failed:mid.inbound.27");
    expect(notice).toHaveBeenCalledWith(scope, expect.objectContaining({ type: "delivery_failed", relatedConversationId: 22 }));
    expect(pause).toHaveBeenCalledWith(scope, 22);
  });
});
