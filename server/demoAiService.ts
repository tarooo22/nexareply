import { metaMessengerService } from "./metaMessengerService";
import { nexareplyRepository, type DraftEvidence, type WorkspaceScope } from "./nexareplyRepository";
import { dispatchDurableQueueWakeup } from "./durableQueueDispatcher";
import { requireEntitlement } from "./entitlementService";

const DEFAULT_HOLDING_REPLY = "ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით.";

export type DemoAiOutcome =
  | { decision: "draft"; text: string; source: "catalog" | "knowledge" }
  | { decision: "needs_human"; text: string; source: "fallback" }
  | { decision: "blocked"; text: string; source: "blocked" };

type GroundedReply = { decision: "draft"; text: string; source: "catalog" | "knowledge"; evidence: DraftEvidence[] };
type ResolvedReply = GroundedReply | { decision: "needs_human"; text: string; source: "fallback" } | { decision: "blocked"; text: string; source: "blocked" };

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

async function resolveDatabaseBackedReply(scope: WorkspaceScope, conversationId: number, options: { automated?: boolean } = {}): Promise<ResolvedReply> {
  if (options.automated && !scope.isDemo) {
    try {
      await requireEntitlement(scope, "ai_automation");
    } catch {
      return { decision: "blocked", text: "AI ავტომატიზაცია ამ workspace-ის მიმდინარე plan-ზე ხელმისაწვდომი არ არის.", source: "blocked" };
    }
  }
  const conversation = await nexareplyRepository.getConversation(scope, conversationId);
  if (!conversation) throw new Error("Conversation not found");
  if (conversation.humanActive || conversation.aiState !== "active") {
    return { decision: "blocked", text: "AI ავტომატური პასუხი შეჩერებულია ადამიანის მართვის დასრულებამდე.", source: "blocked" };
  }

  const history = await nexareplyRepository.listMessages(scope, conversationId);
  const lastCustomerMessage = [...history].reverse().find((message) => message.sender === "customer");
  if (!lastCustomerMessage) throw new Error("No inbound customer message available");
  const question = lastCustomerMessage.body.toLocaleLowerCase("ka-GE");
  const organization = await nexareplyRepository.getOrganization(scope);
  const holdingReply = organization?.fallbackMessage?.trim() || DEFAULT_HOLDING_REPLY;
  const catalog = await nexareplyRepository.listCatalogFacts(scope);
  const matchedCatalog = catalog.find(({ product, variant }) => {
    const model = product.model.toLocaleLowerCase("ka-GE");
    const brandModel = `${product.brand} ${product.model}`.toLocaleLowerCase("ka-GE");
    return question.includes(model) || question.includes(brandModel) || (conversation.preferredProduct?.toLocaleLowerCase("ka-GE") === model);
  });

  if (matchedCatalog) {
    const { product, variant } = matchedCatalog;
    const availability = variant.stock > 0 ? variant.color : "ამ ეტაპზე მარაგში არ არის";
    const text = `${product.brand} ${product.model} · ${variant.storage}. ${availability}. ფასი: ${variant.priceGel} GEL. ${product.description}`;
    return { decision: "draft", text, source: "catalog", evidence: [{ kind: "catalog", label: `${product.brand} · ${product.model}`, detail: `${variant.storage} · ${variant.priceGel} GEL` }] };
  }

  const facts = await nexareplyRepository.listKnowledgeFacts(scope);
  const fact = facts.find((candidate) =>
    (candidate.category === "delivery" && includesAny(question, ["მიწოდ", "კურიერ", "რეგიონ"])) ||
    (candidate.category === "payment" && includesAny(question, ["გადახდ", "ბარათ", "ნაღდ", "გადარიცხ"])) ||
    (candidate.category === "location" && includesAny(question, ["მისამართ", "ფილიალ", "სად", "ლოკაცი"])) ||
    (candidate.category === "authenticity" && includesAny(question, ["ორიგინ", "ავთენტ", "ნამდვილი"])) ||
    (candidate.category === "returns" && includesAny(question, ["დაბრუნ", "გაცვლ", "რეტურნ"])) ||
    (candidate.category === "policy" && includesAny(question, ["წეს", "პოლიტიკ"]))
  );
  if (fact) return { decision: "draft", text: fact.body, source: "knowledge", evidence: [{ kind: "knowledge", label: fact.title, detail: fact.category }] };
  return { decision: "needs_human", text: holdingReply, source: "fallback" };
}

async function persistHumanHandoff(scope: WorkspaceScope, conversationId: number, holdingReply: string) {
  const [conversation, history] = await Promise.all([
    nexareplyRepository.getConversation(scope, conversationId),
    nexareplyRepository.listMessages(scope, conversationId),
  ]);
  if (!conversation) throw new Error("Conversation not found");
  const existingHolding = history.some((message) => message.sender === "ai" && message.body === holdingReply);
  if (!existingHolding) await nexareplyRepository.addMessage(scope, { conversationId, sender: "ai", body: holdingReply, source: "ai", isDraft: true, draftEvidence: [{ kind: "fallback", label: "დადასტურებული პასუხი ვერ მოიძებნა", detail: "Operator handoff required" }] });
  await nexareplyRepository.createTicketOnce(scope, conversationId, "unknown_question", conversation.priority, `needs_human:${conversationId}`);
  await nexareplyRepository.createNotificationOnce(scope, {
    type: "needs_human",
    title: "ოპერატორის ჩართვა საჭიროა",
    body: `${conversation.customerName}-ის კითხვას მიმდინარე catalog-სა და ცოდნის ბაზაში უსაფრთხო პასუხი არ მოეძებნა.`,
    relatedConversationId: conversationId,
    dedupeKey: `needs_human:${conversationId}`,
  });
  await nexareplyRepository.pauseAiForNeedsHuman(scope, conversationId);
  await nexareplyRepository.addAudit(scope, "ai.escalated", "conversation", String(conversationId), { reason: "unknown_question" });
}

async function persistDraft(scope: WorkspaceScope, conversationId: number, reply: GroundedReply): Promise<DemoAiOutcome> {
  await nexareplyRepository.addMessage(scope, { conversationId, sender: "ai", body: reply.text, source: "ai", isDraft: true, draftEvidence: reply.evidence });
  await nexareplyRepository.addAudit(scope, "ai.draft_created", "conversation", String(conversationId), { source: reply.source });
  return { decision: "draft", text: reply.text, source: reply.source };
}

export async function createDatabaseBackedDemoDraft(scope: WorkspaceScope, conversationId: number, options: { automated?: boolean } = {}): Promise<DemoAiOutcome> {
  const reply = await resolveDatabaseBackedReply(scope, conversationId, options);
  if (reply.decision === "draft") return persistDraft(scope, conversationId, reply);
  if (reply.decision === "needs_human") {
    await persistHumanHandoff(scope, conversationId, reply.text);
    return reply;
  }
  return reply;
}

async function recordAutoReplyFailure(scope: WorkspaceScope, input: { conversationId: number; automationEventId: string; messageId?: number; reason: "missing_messenger_identity" | "delivery_failed" }) {
  if (input.messageId) await nexareplyRepository.setAutomatedReplyDelivery(scope, input.messageId, "failed");
  const conversation = await nexareplyRepository.getConversation(scope, input.conversationId);
  if (!conversation) throw new Error("Conversation not found");
  await nexareplyRepository.createTicketOnce(scope, input.conversationId, "auto_reply_delivery_failed", conversation.priority, `auto_reply_delivery_failed:${input.automationEventId}`);
  await nexareplyRepository.createNotificationOnce(scope, {
    type: "delivery_failed",
    title: "AI პასუხი ვერ გაიგზავნა",
    body: input.reason === "missing_messenger_identity" ? "საუბრისთვის Messenger-ის მიმღების იდენტიფიკატორი ვერ მოიძებნა; ოპერატორის ჩართვაა საჭირო." : "AI-ის უსაფრთხო პასუხი Meta არხზე ვერ გაიგზავნა; ოპერატორის ჩართვაა საჭირო.",
    relatedConversationId: input.conversationId,
    dedupeKey: `auto_reply_delivery_failed:${input.automationEventId}`,
  });
  await nexareplyRepository.pauseAiForNeedsHuman(scope, input.conversationId);
  await nexareplyRepository.addAudit(scope, "ai.auto_reply_failed", "conversation", String(input.conversationId), { reason: input.reason, automationEventId: input.automationEventId });
}

export async function processSafeAutoReply(scope: WorkspaceScope, input: { conversationId: number; inboundEventId: string }) {
  const reply = await resolveDatabaseBackedReply(scope, input.conversationId, { automated: true });
  if (reply.decision === "needs_human") {
    await persistHumanHandoff(scope, input.conversationId, reply.text);
    return { status: "needs_human" as const, source: reply.source };
  }
  if (reply.decision === "blocked") return { status: "blocked" as const, reason: reply.text };

  const organization = await nexareplyRepository.getOrganization(scope);
  if (!organization?.autoReplyEnabled) {
    await persistDraft(scope, input.conversationId, reply);
    return { status: "draft" as const, source: reply.source };
  }

  const beforeReservation = await nexareplyRepository.getConversation(scope, input.conversationId);
  if (!beforeReservation || beforeReservation.humanActive || beforeReservation.aiState !== "active") return { status: "blocked" as const, reason: "AI პასუხი ოპერატორის takeover-ის გამო არ გაიგზავნა." };
  const participant = await nexareplyRepository.getCustomerParticipant(scope, input.conversationId);
  const psid = participant?.externalId?.startsWith("meta:") ? participant.externalId.split(":").at(-1) : null;
  if (!psid) {
    await persistDraft(scope, input.conversationId, reply);
    await recordAutoReplyFailure(scope, { conversationId: input.conversationId, automationEventId: input.inboundEventId, reason: "missing_messenger_identity" });
    return { status: "needs_human" as const, source: "missing_messenger_identity" as const };
  }

  const reservation = await nexareplyRepository.reserveAutomatedReply(scope, { conversationId: input.conversationId, body: reply.text, automationEventId: input.inboundEventId, draftEvidence: reply.evidence });
  if (!reservation.created) {
    if (reservation.message.deliveryStatus === "queued") {
      await recordAutoReplyFailure(scope, { conversationId: input.conversationId, automationEventId: input.inboundEventId, messageId: reservation.message.id, reason: "delivery_failed" });
      return { status: "needs_human" as const, source: "recovery_required" as const };
    }
    return { status: "duplicate" as const, deliveryStatus: reservation.message.deliveryStatus };
  }

  const immediatelyBeforeSend = await nexareplyRepository.getConversation(scope, input.conversationId);
  if (!immediatelyBeforeSend || immediatelyBeforeSend.humanActive || immediatelyBeforeSend.aiState !== "active") {
    await nexareplyRepository.setAutomatedReplyDelivery(scope, reservation.message.id, "failed");
    await nexareplyRepository.addAudit(scope, "ai.auto_reply_cancelled", "conversation", String(input.conversationId), { reason: "human_takeover", automationEventId: input.inboundEventId });
    return { status: "blocked" as const, reason: "AI პასუხი ოპერატორის takeover-ის გამო არ გაიგზავნა." };
  }

  const delivery = await metaMessengerService.sendText(scope, { psid, text: reply.text });
  if (!delivery.delivered) {
    await recordAutoReplyFailure(scope, { conversationId: input.conversationId, automationEventId: input.inboundEventId, messageId: reservation.message.id, reason: "delivery_failed" });
    return { status: "needs_human" as const, source: "delivery_failed" as const };
  }
  await nexareplyRepository.setAutomatedReplyDelivery(scope, reservation.message.id, "sent");
  await nexareplyRepository.addAudit(scope, "ai.auto_reply_sent", "conversation", String(input.conversationId), { source: reply.source, automationEventId: input.inboundEventId });
  return { status: "sent" as const, source: reply.source };
}

export async function recordInboundDemoMessage(scope: WorkspaceScope, input: { conversationId: number; body: string; inboundEventId: string }) {
  const conversation = await nexareplyRepository.getConversation(scope, input.conversationId);
  if (!conversation) throw new Error("Conversation not found");
  await nexareplyRepository.addMessage(scope, { conversationId: input.conversationId, sender: "customer", body: input.body, source: "demo", inboundEventId: input.inboundEventId });
  const organization = await nexareplyRepository.getOrganization(scope);
  const scheduledAt = new Date(Date.now() + (organization?.debounceSeconds ?? 10) * 1000);
  const jobId = await nexareplyRepository.scheduleConversationProcessing(scope, input.conversationId, input.inboundEventId, scheduledAt);
  try { await dispatchDurableQueueWakeup(scheduledAt.getTime() - Date.now()); } catch { /* the persistent job remains available for configured worker recovery */ }
  await nexareplyRepository.addAudit(scope, "conversation.inbound_recorded", "conversation", String(input.conversationId), { inboundEventId: input.inboundEventId, jobId, scheduledAt: scheduledAt.toISOString() });
  return { jobId, scheduledAt };
}
