import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { seedAmadeoDemo } from "./demoSeed";
import { createDatabaseBackedDemoDraft, recordInboundDemoMessage } from "./demoAiService";
import { processDueConversationJobs } from "./jobWorker";
import { commitCatalogImport, exportSalesCsv, previewCatalogImport } from "./importExportService";
import { metaMessengerService } from "./metaMessengerService";
import { requireEntitlement, requireMemberCapacity } from "./entitlementService";
import { invitationService } from "./invitationService";
import { knowledgeDraftService } from "./knowledgeDraftService";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";
import { productAssetService } from "./productAssetService";
import { storageGet } from "./storage";
import { requireWorkspaceRole } from "./workspaceAuthorization";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const organizationInput = z.object({ organizationId: z.number().int().positive() });
const productInput = z.object({
  brand: z.string().min(1).max(100),
  fragranceName: z.string().min(1).max(160).optional(),
  model: z.string().min(1).max(160).optional(),
  sku: z.string().min(1).max(120),
  volume: z.string().min(1).max(80).optional(),
  storage: z.string().min(1).max(80).optional(),
  availability: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  priceGel: z.string().regex(/^\d+(\.\d{1,2})?$/),
  stock: z.number().int().min(0),
  installment: z.string().min(1).max(120).optional(),
  warranty: z.string().min(1).max(120).optional(),
}).refine((product) => Boolean(product.fragranceName || product.model), { message: "სურნელის დასახელება სავალდებულოა." });
// Zod v4 keeps refinements on a ZodObject, but intentionally disallows calling
// `.partial()` on that refined object. Rebuild an unrefined patch schema from
// its field shape so a product can still be updated one field at a time.
const productPatchInput = z.object(productInput.shape).partial();
const mappingInput = z.object({
  brand: z.string(), fragranceName: z.string().optional(), model: z.string().optional(), sku: z.string(), priceGel: z.string(), stock: z.string(),
  availability: z.string().optional(), color: z.string().optional(), volume: z.string().optional(), storage: z.string().optional(), description: z.string().optional(), installment: z.string().optional(), warranty: z.string().optional(),
}).refine((mapping) => Boolean(mapping.fragranceName || mapping.model), { message: "სურნელის სვეტი სავალდებულოა." });
const uploadInput = z.object({ base64: z.string().min(1).max(10_000_000), fileName: z.string().min(5).max(255), mapping: mappingInput.optional(), importId: z.number().int().positive().optional() });
const productAssetUploadInput = z.object({
  productId: z.number().int().positive(),
  base64: z.string().min(4).max(7_000_000),
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  altText: z.string().trim().max(280).optional(),
});

function knowledgeDto(row: any) { return { id: row.id, title: row.title, body: row.body, category: row.category, active: row.active, createdAt: row.createdAt, updatedAt: row.updatedAt }; }
function conversationDto(row: any) { return { id: row.id, leadId: row.leadId, customerName: row.customerName, customerPhone: row.customerPhone, status: row.status, humanActive: row.humanActive, aiState: row.aiState, priority: row.priority, preview: row.preview, preferredProduct: row.preferredProduct, lastInboundAt: row.lastInboundAt, lastMessageAt: row.lastMessageAt, createdAt: row.createdAt, updatedAt: row.updatedAt }; }
function safeDraftEvidence(value: unknown) {
  if (!Array.isArray(value)) return [] as Array<{ kind: "catalog" | "knowledge" | "fallback"; label: string; detail?: string }>;
  return value.slice(0, 3).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    const kind = candidate.kind;
    const label = candidate.label;
    if ((kind !== "catalog" && kind !== "knowledge" && kind !== "fallback") || typeof label !== "string") return [];
    return [{ kind, label: label.slice(0, 180), ...(typeof candidate.detail === "string" ? { detail: candidate.detail.slice(0, 180) } : {}) }];
  });
}
function messageDto(row: any) { return { id: row.id, conversationId: row.conversationId, sender: row.sender, body: row.body, source: row.source, isDraft: row.isDraft, draftEvidence: safeDraftEvidence(row.draftEvidence), deliveryStatus: row.deliveryStatus, approvedAt: row.approvedAt, createdAt: row.createdAt }; }
function alertDto(row: any) { return { id: row.id, type: row.type, title: row.title, body: row.body, relatedConversationId: row.relatedConversationId, readAt: row.readAt, createdAt: row.createdAt }; }
function analyticsDto(row: any) { return { conversationCount: row.conversationCount, aiReplies: row.aiReplies, humanReplies: row.humanReplies, qualifiedLeads: row.qualifiedLeads, handoffs: row.handoffs, draftOrderCount: row.draftOrderCount, responseRate: row.responseRate, dailyVolume: row.dailyVolume.map((day: any) => ({ day: day.day, ai: day.ai, human: day.human })) }; }
function ticketDto(row: any) { return { ticket: { id: row.ticket.id, conversationId: row.ticket.conversationId, reason: row.ticket.reason, status: row.ticket.status, priority: row.ticket.priority, createdAt: row.ticket.createdAt, updatedAt: row.ticket.updatedAt }, conversation: conversationDto(row.conversation) }; }
function assistantDto(row: any) { return { aiPersona: row?.aiPersona ?? "მეგობრული გაყიდვების კონსულტანტი", aiTone: row?.aiTone ?? "თბილი და კონკრეტული", replyLength: row?.replyLength ?? "normal", fallbackMessage: row?.fallbackMessage ?? "ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით." }; }
async function productAssetDto(row: any) { const { url } = await storageGet(row.storageKey); return { id: row.id, productId: row.productId, url, mimeType: row.mimeType, byteSize: row.byteSize, width: row.width, height: row.height, altText: row.altText, sortOrder: row.sortOrder, isPrimary: row.isPrimary, createdAt: row.createdAt, updatedAt: row.updatedAt }; }
function knowledgeDraftDto(row: any) { return { source: { id: row.source.id, title: row.source.title, originalText: row.source.originalText, status: row.source.status, version: row.source.version, createdAt: row.source.createdAt, updatedAt: row.source.updatedAt }, draft: { id: row.draft.id, sourceId: row.draft.sourceId, title: row.draft.title, body: row.draft.body, category: row.draft.category, confidence: row.draft.confidence, status: row.draft.status, approvedKnowledgeFactId: row.draft.approvedKnowledgeFactId, reviewedAt: row.draft.reviewedAt, createdAt: row.draft.createdAt, updatedAt: row.draft.updatedAt } }; }

async function demoScope() {
  await seedAmadeoDemo();
  return nexareplyRepository.getPublicDemoScope();
}

async function workspaceScope(userId: number, organizationId: number, requiredRole?: "owner"): Promise<WorkspaceScope> {
  const scope = await nexareplyRepository.getWorkspaceScope(userId, organizationId);
  if (!scope) throw new TRPCError({ code: "FORBIDDEN", message: "ამ ორგანიზაციაზე წვდომა არ გაქვთ." });
  if (requiredRole) requireWorkspaceRole(scope.role, requiredRole);
  return scope;
}

function makeDataRouter(getScope: (input: { organizationId?: number }) => Promise<WorkspaceScope>) {
  return router({
    overview: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => nexareplyRepository.getOverview(await getScope(input ?? {}))),
    products: router({
      list: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), query: z.string().max(160).optional(), includeArchived: z.boolean().optional() }).optional()).query(async ({ input }) => nexareplyRepository.listProducts(await getScope(input ?? {}), input?.query, input?.includeArchived)),
      create: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), product: productInput })).mutation(async ({ input }) => nexareplyRepository.createProduct(await getScope(input), input.product)),
      update: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), productId: z.number().int().positive(), patch: productPatchInput })).mutation(async ({ input }) => nexareplyRepository.updateProduct(await getScope(input), input.productId, input.patch)),
      archive: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), productId: z.number().int().positive() })).mutation(async ({ input }) => nexareplyRepository.archiveProduct(await getScope(input), input.productId)),
    }),
    knowledge: router({
      list: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => (await nexareplyRepository.listKnowledgeFacts(await getScope(input ?? {}))).map(knowledgeDto)),
      create: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), title: z.string().min(1).max(180), body: z.string().min(1), category: z.string().max(80).optional() })).mutation(async ({ input }) => nexareplyRepository.createKnowledgeFact(await getScope(input), input.title, input.body, input.category)),
      update: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), id: z.number().int().positive(), title: z.string().min(1).max(180), body: z.string().min(1), category: z.string().max(80).optional() })).mutation(async ({ input }) => nexareplyRepository.updateKnowledgeFact(await getScope(input), input.id, input)),
      archive: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), id: z.number().int().positive() })).mutation(async ({ input }) => nexareplyRepository.deleteKnowledgeFact(await getScope(input), input.id)),
    }),
    conversations: router({
      list: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), query: z.string().max(160).optional(), status: z.enum(["open", "pending", "closed"]).optional() }).optional()).query(async ({ input }) => (await nexareplyRepository.listConversations(await getScope(input ?? {}), input?.query, input?.status)).map(conversationDto)),
      messages: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), conversationId: z.number().int().positive() })).query(async ({ input }) => (await nexareplyRepository.listMessages(await getScope(input), input.conversationId)).map(messageDto)),
      inboundDemo: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), conversationId: z.number().int().positive(), body: z.string().min(1).max(2000), inboundEventId: z.string().min(8).max(160) })).mutation(async ({ input }) => recordInboundDemoMessage(await getScope(input), input)),
      createDraft: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), conversationId: z.number().int().positive() })).mutation(async ({ input }) => createDatabaseBackedDemoDraft(await getScope(input), input.conversationId)),
      takeover: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), conversationId: z.number().int().positive(), active: z.boolean() })).mutation(async ({ input }) => nexareplyRepository.setHumanTakeover(await getScope(input), input.conversationId, input.active)),
      approveDraft: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), conversationId: z.number().int().positive(), body: z.string().min(1).max(2000) })).mutation(async ({ input }) => nexareplyRepository.addMessage(await getScope(input), { conversationId: input.conversationId, sender: "operator", body: input.body, source: "manual", approvedAt: new Date() })),
    }),
    leads: router({
      list: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => nexareplyRepository.listLeads(await getScope(input ?? {}))),
      updateStage: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), leadId: z.number().int().positive(), stage: z.enum(["new", "qualified", "negotiating", "draft_order", "closed_lost"]) })).mutation(async ({ input }) => nexareplyRepository.updateLeadStage(await getScope(input), input.leadId, input.stage)),
      draftOrders: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => nexareplyRepository.listDraftOrders(await getScope(input ?? {}))),
    }),
    notifications: router({
      list: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => (await nexareplyRepository.listNotifications(await getScope(input ?? {}))).map(alertDto)),
      markRead: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), ids: z.array(z.number().int().positive()).optional() })).mutation(async ({ input }) => nexareplyRepository.markNotificationsRead(await getScope(input), input.ids)),
    }),
    analytics: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => analyticsDto(await nexareplyRepository.getAnalytics(await getScope(input ?? {})))),
  });
}

const demoDataRouter = makeDataRouter(async () => demoScope());

export const nexareplyRouter = router({
  invitations: router({
    preview: publicProcedure.input(z.object({ token: z.string().min(32).max(128) })).query(async ({ input }) => invitationService.getPublicInvite(input.token)),
    accept: protectedProcedure.input(z.object({ token: z.string().min(32).max(128) })).mutation(async ({ ctx, input }) => invitationService.accept(input.token, ctx.user)),
  }),
  demo: router({
    bootstrap: publicProcedure.query(async () => {
      const scope = await demoScope();
      return { organizationId: scope.organizationId, mode: "demo" as const };
    }),
    data: demoDataRouter,
    workerPreview: publicProcedure.mutation(async () => processDueConversationJobs()),
    imports: router({
      preview: publicProcedure.input(uploadInput).mutation(async ({ input }) => previewCatalogImport(await demoScope(), input)),
      commit: publicProcedure.input(uploadInput).mutation(async ({ input }) => commitCatalogImport(await demoScope(), input)),
      exportCsv: publicProcedure.input(z.object({ kind: z.enum(["leads", "orders", "products"]) })).query(async ({ input }) => exportSalesCsv(await demoScope(), input.kind)),
    }),
  }),
  workspace: router({
    organizations: protectedProcedure.query(async ({ ctx }) => nexareplyRepository.listOrganizationsForUser(ctx.user.id)),
    bootstrap: protectedProcedure.mutation(async ({ ctx }) => nexareplyRepository.ensureWorkspaceForUser(ctx.user.id, ctx.user.name)),
    createOrganization: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(160) })).mutation(async ({ ctx, input }) => nexareplyRepository.createSelfServiceOrganization(ctx.user.id, input)),
    entitlements: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.getEntitlements(await workspaceScope(ctx.user.id, input.organizationId))),
    overview: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.getOverview(await workspaceScope(ctx.user.id, input.organizationId))),
    onboarding: router({
      state: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.getOnboarding(await workspaceScope(ctx.user.id, input.organizationId))),
      dismiss: protectedProcedure.input(organizationInput).mutation(async ({ ctx, input }) => nexareplyRepository.dismissOnboarding(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
      restart: protectedProcedure.input(organizationInput).mutation(async ({ ctx, input }) => nexareplyRepository.restartOnboarding(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
    }),
    products: router({
      list: protectedProcedure.input(organizationInput.extend({ query: z.string().max(160).optional(), includeArchived: z.boolean().optional() })).query(async ({ ctx, input }) => nexareplyRepository.listProducts(await workspaceScope(ctx.user.id, input.organizationId), input.query, input.includeArchived)),
      create: protectedProcedure.input(organizationInput.extend({ product: productInput })).mutation(async ({ ctx, input }) => nexareplyRepository.createProduct(await workspaceScope(ctx.user.id, input.organizationId), input.product)),
      update: protectedProcedure.input(organizationInput.extend({ productId: z.number().int().positive(), patch: productPatchInput })).mutation(async ({ ctx, input }) => nexareplyRepository.updateProduct(await workspaceScope(ctx.user.id, input.organizationId), input.productId, input.patch)),
      archive: protectedProcedure.input(organizationInput.extend({ productId: z.number().int().positive() })).mutation(async ({ ctx, input }) => nexareplyRepository.archiveProduct(await workspaceScope(ctx.user.id, input.organizationId), input.productId)),
      assets: router({
        list: protectedProcedure.input(organizationInput.extend({ productId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => Promise.all((await nexareplyRepository.listProductAssets(await workspaceScope(ctx.user.id, input.organizationId), input.productId)).map(productAssetDto))),
        upload: protectedProcedure.input(organizationInput.extend(productAssetUploadInput.shape)).mutation(async ({ ctx, input }) => productAssetDto(await productAssetService.upload(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input))),
        update: protectedProcedure.input(organizationInput.extend({ assetId: z.number().int().positive(), altText: z.string().trim().max(280).nullable().optional(), sortOrder: z.number().int().min(0).max(5).optional(), isPrimary: z.boolean().optional() })).mutation(async ({ ctx, input }) => productAssetDto(await nexareplyRepository.updateProductAsset(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.assetId, input))),
        archive: protectedProcedure.input(organizationInput.extend({ assetId: z.number().int().positive() })).mutation(async ({ ctx, input }) => nexareplyRepository.archiveProductAsset(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.assetId)),
      }),
    }),
    knowledge: router({
      list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => (await nexareplyRepository.listKnowledgeFacts(await workspaceScope(ctx.user.id, input.organizationId))).map(knowledgeDto)),
      create: protectedProcedure.input(organizationInput.extend({ title: z.string().min(1).max(180), body: z.string().min(1), category: z.string().max(80).optional() })).mutation(async ({ ctx, input }) => nexareplyRepository.createKnowledgeFact(await workspaceScope(ctx.user.id, input.organizationId), input.title, input.body, input.category)),
      update: protectedProcedure.input(organizationInput.extend({ id: z.number().int().positive(), title: z.string().min(1).max(180), body: z.string().min(1), category: z.string().max(80).optional() })).mutation(async ({ ctx, input }) => nexareplyRepository.updateKnowledgeFact(await workspaceScope(ctx.user.id, input.organizationId), input.id, input)),
      archive: protectedProcedure.input(organizationInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => nexareplyRepository.deleteKnowledgeFact(await workspaceScope(ctx.user.id, input.organizationId), input.id)),
      drafts: router({
        list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => (await nexareplyRepository.listKnowledgeDrafts(await workspaceScope(ctx.user.id, input.organizationId, "owner"))).map(knowledgeDraftDto)),
        generate: protectedProcedure.input(organizationInput.extend({ title: z.string().trim().min(3).max(180), originalText: z.string().trim().min(20).max(8000) })).mutation(async ({ ctx, input }) => {
          try { return await knowledgeDraftService.generate(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input); }
          catch { throw new TRPCError({ code: "BAD_REQUEST", message: "სტრუქტურირებული draft ვერ შეიქმნა. გადაამოწმეთ ტექსტი და სცადეთ ხელახლა." }); }
        }),
        approve: protectedProcedure.input(organizationInput.extend({ sourceId: z.number().int().positive(), draftIds: z.array(z.number().int().positive()).min(1).max(12) })).mutation(async ({ ctx, input }) => (await nexareplyRepository.approveKnowledgeDrafts(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.sourceId, input.draftIds)).map(knowledgeDraftDto)),
        reject: protectedProcedure.input(organizationInput.extend({ draftId: z.number().int().positive() })).mutation(async ({ ctx, input }) => nexareplyRepository.rejectKnowledgeDraft(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.draftId)),
        update: protectedProcedure.input(organizationInput.extend({ draftId: z.number().int().positive(), title: z.string().trim().min(3).max(180), body: z.string().trim().min(8).max(1200), category: z.enum(["delivery", "payment", "location", "authenticity", "returns", "policy", "general"]) })).mutation(async ({ ctx, input }) => nexareplyRepository.updateKnowledgeDraft(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.draftId, input)),
      }),
    }),
    conversations: router({
      list: protectedProcedure.input(organizationInput.extend({ query: z.string().max(160).optional(), status: z.enum(["open", "pending", "closed"]).optional() })).query(async ({ ctx, input }) => (await nexareplyRepository.listConversations(await workspaceScope(ctx.user.id, input.organizationId), input.query, input.status)).map(conversationDto)),
      listPage: protectedProcedure.input(organizationInput.extend({ query: z.string().max(160).optional(), status: z.enum(["open", "pending", "closed"]).optional(), cursor: z.object({ updatedAt: z.coerce.date(), id: z.number().int().positive() }).optional(), limit: z.number().int().min(10).max(50).default(30) })).query(async ({ ctx, input }) => {
        const page = await nexareplyRepository.listConversationPage(await workspaceScope(ctx.user.id, input.organizationId), input);
        return { items: page.items.map(conversationDto), nextCursor: page.nextCursor };
      }),
      messages: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => (await nexareplyRepository.listMessages(await workspaceScope(ctx.user.id, input.organizationId), input.conversationId)).map(messageDto)),
      context: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
        const context = await nexareplyRepository.getConversationContext(await workspaceScope(ctx.user.id, input.organizationId), input.conversationId);
        if (!context) throw new TRPCError({ code: "NOT_FOUND", message: "საუბარი ვერ მოიძებნა." });
        return {
          conversation: conversationDto(context.conversation),
          customer: context.participant ? { displayName: context.participant.displayName, hasMessengerIdentity: Boolean(context.participant.externalId) } : null,
          activeTicket: context.activeTicket ? { id: context.activeTicket.id, reason: context.activeTicket.reason, status: context.activeTicket.status, priority: context.activeTicket.priority, createdAt: context.activeTicket.createdAt } : null,
        };
      }),
      inboundDemo: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive(), body: z.string().min(1).max(2000), inboundEventId: z.string().min(8).max(160) })).mutation(async ({ ctx, input }) => recordInboundDemoMessage(await workspaceScope(ctx.user.id, input.organizationId), input)),
      createDraft: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => createDatabaseBackedDemoDraft(await workspaceScope(ctx.user.id, input.organizationId), input.conversationId)),
      takeover: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive(), active: z.boolean() })).mutation(async ({ ctx, input }) => nexareplyRepository.setHumanTakeover(await workspaceScope(ctx.user.id, input.organizationId), input.conversationId, input.active)),
      handoff: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive(), reason: z.string().trim().min(3).max(200), priority: z.enum(["normal", "high"]).default("normal") })).mutation(async ({ ctx, input }) => {
        const scope = await workspaceScope(ctx.user.id, input.organizationId);
        const ticket = await nexareplyRepository.createTicketOnce(scope, input.conversationId, input.reason, input.priority, `operator_handoff:${input.conversationId}:${input.reason.toLocaleLowerCase("ka-GE")}`);
        await nexareplyRepository.createNotificationOnce(scope, { type: "needs_human", title: "Operator handoff გაიხსნა", body: input.reason, relatedConversationId: input.conversationId, dedupeKey: `operator_handoff:${input.conversationId}:${input.reason.toLocaleLowerCase("ka-GE")}` });
        return { id: ticket.id, status: ticket.status, priority: ticket.priority };
      }),
      approveDraft: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive(), body: z.string().min(1).max(2000) })).mutation(async ({ ctx, input }) => nexareplyRepository.addMessage(await workspaceScope(ctx.user.id, input.organizationId), { conversationId: input.conversationId, sender: "operator", body: input.body, source: "manual", approvedAt: new Date() })),
      sendReply: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive(), body: z.string().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
        const scope = await workspaceScope(ctx.user.id, input.organizationId);
        const participant = await nexareplyRepository.getCustomerParticipant(scope, input.conversationId);
        const psid = participant?.externalId?.startsWith("meta:") ? participant.externalId.split(":").at(-1) : null;
        if (psid) {
          const delivery = await metaMessengerService.sendText(scope, { psid, text: input.body });
          if (!delivery.delivered) {
            await nexareplyRepository.addMessage(scope, { conversationId: input.conversationId, sender: "operator", body: input.body, source: "manual", approvedAt: new Date(), deliveryStatus: "failed" });
            throw new TRPCError({ code: "BAD_REQUEST", message: delivery.error });
          }
        }
        await nexareplyRepository.addMessage(scope, { conversationId: input.conversationId, sender: "operator", body: input.body, source: "manual", approvedAt: new Date(), deliveryStatus: "sent" });
        return { delivered: Boolean(psid), channel: psid ? "meta" as const : "workspace" as const };
      }),
    }),
    leads: router({
      list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listLeads(await workspaceScope(ctx.user.id, input.organizationId))),
      updateStage: protectedProcedure.input(organizationInput.extend({ leadId: z.number().int().positive(), stage: z.enum(["new", "qualified", "negotiating", "draft_order", "closed_lost"]) })).mutation(async ({ ctx, input }) => nexareplyRepository.updateLeadStage(await workspaceScope(ctx.user.id, input.organizationId), input.leadId, input.stage)),
      draftOrders: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listDraftOrders(await workspaceScope(ctx.user.id, input.organizationId))),
    }),
    notifications: router({
      list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => (await nexareplyRepository.listNotifications(await workspaceScope(ctx.user.id, input.organizationId))).map(alertDto)),
      markRead: protectedProcedure.input(organizationInput.extend({ ids: z.array(z.number().int().positive()).optional() })).mutation(async ({ ctx, input }) => nexareplyRepository.markNotificationsRead(await workspaceScope(ctx.user.id, input.organizationId), input.ids)),
    }),
    analytics: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => analyticsDto(await nexareplyRepository.getAnalytics(await workspaceScope(ctx.user.id, input.organizationId)))),
    operations: router({
      queueStatus: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => {
        const status = await nexareplyRepository.getQueueStatus(await workspaceScope(ctx.user.id, input.organizationId, "owner"));
        return { pending: status.pending, processing: status.processing, retrying: status.retrying, failed: status.failed, deadLetter: status.deadLetter, overdue: status.overdue, oldestPendingAt: status.oldestPendingAt, tenSecondGuarantee: status.tenSecondGuarantee, schedulerCadenceSeconds: status.schedulerCadenceSeconds, schedulerStatus: status.schedulerStatus };
      }),
      queueFailures: protectedProcedure.input(organizationInput.extend({ limit: z.number().int().min(1).max(50).default(30) })).query(async ({ ctx, input }) => {
        const failures = await nexareplyRepository.listQueueFailures(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.limit);
        return failures.map((job) => ({ id: job.id, conversationId: job.conversationId, status: job.status, attempts: job.attempts, maxAttempts: job.maxAttempts, scheduledAt: job.scheduledAt, lastAttemptAt: job.lastAttemptAt, deadLetteredAt: job.deadLetteredAt, errorState: job.lastError ? "processing_failed" as const : null, updatedAt: job.updatedAt }));
      }),
      redriveDeadLetter: protectedProcedure.input(organizationInput.extend({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const job = await nexareplyRepository.redriveDeadLetterJob(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Dead-letter job ვერ მოიძებნა." });
        return job;
      }),
    }),
    tickets: router({
      list: protectedProcedure.input(organizationInput.extend({ status: z.enum(["open", "resolved", "closed"]).optional() })).query(async ({ ctx, input }) => (await nexareplyRepository.listTickets(await workspaceScope(ctx.user.id, input.organizationId), input.status)).map(ticketDto)),
      resolve: protectedProcedure.input(organizationInput.extend({ ticketId: z.number().int().positive() })).mutation(async ({ ctx, input }) => nexareplyRepository.resolveTicket(await workspaceScope(ctx.user.id, input.organizationId), input.ticketId)),
    }),
    assistant: router({
      settings: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => {
        const organization = await nexareplyRepository.getOrganization(await workspaceScope(ctx.user.id, input.organizationId));
        return assistantDto(organization);
      }),
      update: protectedProcedure.input(organizationInput.extend({ aiPersona: z.string().min(8).max(180), aiTone: z.string().min(3).max(100), replyLength: z.enum(["short", "normal", "detailed"]), fallbackMessage: z.string().min(5).max(2000) })).mutation(async ({ ctx, input }) => assistantDto(await nexareplyRepository.updateAssistantSettings(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input))),
    }),
    imports: router({
      preview: protectedProcedure.input(organizationInput.extend(uploadInput.shape)).mutation(async ({ ctx, input }) => previewCatalogImport(await workspaceScope(ctx.user.id, input.organizationId), input)),
      commit: protectedProcedure.input(organizationInput.extend(uploadInput.shape)).mutation(async ({ ctx, input }) => commitCatalogImport(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input)),
      exportCsv: protectedProcedure.input(organizationInput.extend({ kind: z.enum(["leads", "orders", "products"]) })).query(async ({ ctx, input }) => exportSalesCsv(await workspaceScope(ctx.user.id, input.organizationId), input.kind)),
      history: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => (await nexareplyRepository.listProductImports(await workspaceScope(ctx.user.id, input.organizationId, "owner"))).map((record) => ({ id: record.id, fileName: record.fileName, format: record.format, status: record.status, validRows: record.validRows, invalidRows: record.invalidRows, createdAt: record.createdAt }))),
    }),
    owner: router({
      accountDeletion: router({
        list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listAccountDeletionRequests(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
        request: protectedProcedure.input(organizationInput.extend({ reason: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
          const scope = await workspaceScope(ctx.user.id, input.organizationId, "owner");
          if (!ctx.user.email) throw new Error("ანგარიშის ელფოსტა ვერ დადასტურდა.");
          return nexareplyRepository.createAccountDeletionRequest(scope, { requesterEmail: ctx.user.email, reason: input.reason });
        }),
      }),
      integrationStates: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listIntegrationStates(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
      meta: router({
        status: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => metaMessengerService.getConnectionStatus(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
        startOAuth: protectedProcedure.input(organizationInput).mutation(async ({ ctx, input }) => {
          const scope = await workspaceScope(ctx.user.id, input.organizationId, "owner");
          await requireEntitlement(scope, "meta_channel");
          return metaMessengerService.persistOAuthStart(scope);
        }),
        oauthPages: protectedProcedure.input(organizationInput.extend({ sessionId: z.string().min(16).max(64) })).query(async ({ ctx, input }) => metaMessengerService.getOAuthPages(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.sessionId)),
        selectPage: protectedProcedure.input(organizationInput.extend({ sessionId: z.string().min(16).max(64), pageId: z.string().min(1).max(80) })).mutation(async ({ ctx, input }) => metaMessengerService.selectPage(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input)),
        manualConnect: protectedProcedure.input(organizationInput.extend({ pageId: z.string().trim().regex(/^\d{5,30}$/), pageAccessToken: z.string().trim().min(20).max(4096) })).mutation(async ({ ctx, input }) => {
          const scope = await workspaceScope(ctx.user.id, input.organizationId, "owner");
          await requireEntitlement(scope, "meta_channel");
          if (!metaMessengerService.isManualSetupEnabled()) throw new Error("Manual Meta setup is disabled.");
          return metaMessengerService.connectManualPage(scope, { pageId: input.pageId, pageAccessToken: input.pageAccessToken });
        }),
        disconnect: protectedProcedure.input(organizationInput).mutation(async ({ ctx, input }) => metaMessengerService.disconnect(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
        sendText: protectedProcedure.input(organizationInput.extend({ psid: z.string().min(1).max(160), text: z.string().min(1).max(2000) })).mutation(async ({ ctx, input }) => metaMessengerService.sendText(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input)),
      }),
    }),
    memberships: router({
      list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listMemberships(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
      setRole: protectedProcedure.input(organizationInput.extend({ userId: z.number().int().positive(), role: z.enum(["owner", "operator"]) })).mutation(async ({ ctx, input }) => nexareplyRepository.setMembershipRole(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.userId, input.role)),
      invitations: router({
        list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => invitationService.listForOwner(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
        create: protectedProcedure.input(organizationInput.extend({ email: z.string().trim().email().max(320) })).mutation(async ({ ctx, input }) => {
          const scope = await workspaceScope(ctx.user.id, input.organizationId, "owner");
          await requireMemberCapacity(scope);
          return invitationService.create(scope, input.email);
        }),
        cancel: protectedProcedure.input(organizationInput.extend({ invitationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => invitationService.cancel(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.invitationId)),
        resend: protectedProcedure.input(organizationInput.extend({ invitationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => invitationService.resend(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.invitationId)),
      }),
    }),
  }),
});
