import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";
import { dispatchDurableQueueWakeup } from "./durableQueueDispatcher";

const DEFAULT_HOLDING_REPLY = "ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით.";

export type DemoAiOutcome =
  | { decision: "draft"; text: string; source: "catalog" | "knowledge" }
  | { decision: "needs_human"; text: string; source: "fallback" }
  | { decision: "blocked"; text: string; source: "blocked" };

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

export async function createDatabaseBackedDemoDraft(scope: WorkspaceScope, conversationId: number): Promise<DemoAiOutcome> {
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
    await nexareplyRepository.addMessage(scope, { conversationId, sender: "ai", body: text, source: "ai", isDraft: true, draftEvidence: [{ kind: "catalog", label: `${product.brand} · ${product.model}`, detail: `${variant.storage} · ${variant.priceGel} GEL` }] });
    await nexareplyRepository.addAudit(scope, "ai.draft_created", "conversation", String(conversationId), { source: "catalog", productId: product.id, variantId: variant.id });
    return { decision: "draft", text, source: "catalog" };
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
  if (fact) {
    await nexareplyRepository.addMessage(scope, { conversationId, sender: "ai", body: fact.body, source: "ai", isDraft: true, draftEvidence: [{ kind: "knowledge", label: fact.title, detail: fact.category }] });
    await nexareplyRepository.addAudit(scope, "ai.draft_created", "conversation", String(conversationId), { source: "knowledge", factId: fact.id });
    return { decision: "draft", text: fact.body, source: "knowledge" };
  }

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
  return { decision: "needs_human", text: holdingReply, source: "fallback" };
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
