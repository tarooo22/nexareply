import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { seedTechZoneDemo } from "./demoSeed";
import { createDatabaseBackedDemoDraft, recordInboundDemoMessage } from "./demoAiService";
import { processDueConversationJobs } from "./jobWorker";
import { commitCatalogImport, exportSalesCsv, previewCatalogImport } from "./importExportService";
import { metaMessengerService } from "./metaMessengerService";
import { invitationService } from "./invitationService";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";
import { requireWorkspaceRole } from "./workspaceAuthorization";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const organizationInput = z.object({ organizationId: z.number().int().positive() });
const productInput = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(160),
  sku: z.string().min(1).max(120),
  storage: z.string().min(1).max(80),
  color: z.string().min(1).max(100),
  priceGel: z.string().regex(/^\d+(\.\d{1,2})?$/),
  stock: z.number().int().min(0),
  installment: z.string().min(1).max(120),
  warranty: z.string().min(1).max(120),
});
const mappingInput = z.object({ brand: z.string(), model: z.string(), sku: z.string(), priceGel: z.string(), stock: z.string(), color: z.string(), storage: z.string().optional(), installment: z.string().optional(), warranty: z.string().optional() });
const uploadInput = z.object({ base64: z.string().min(1).max(10_000_000), fileName: z.string().min(5).max(255), mapping: mappingInput.optional() });

async function demoScope() {
  await seedTechZoneDemo();
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
      update: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), productId: z.number().int().positive(), patch: productInput.partial() })).mutation(async ({ input }) => nexareplyRepository.updateProduct(await getScope(input), input.productId, input.patch)),
      archive: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), productId: z.number().int().positive() })).mutation(async ({ input }) => nexareplyRepository.archiveProduct(await getScope(input), input.productId)),
    }),
    knowledge: router({
      list: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => nexareplyRepository.listKnowledgeFacts(await getScope(input ?? {}))),
      create: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), title: z.string().min(1).max(180), body: z.string().min(1), category: z.string().max(80).optional() })).mutation(async ({ input }) => nexareplyRepository.createKnowledgeFact(await getScope(input), input.title, input.body, input.category)),
      update: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), id: z.number().int().positive(), title: z.string().min(1).max(180), body: z.string().min(1), category: z.string().max(80).optional() })).mutation(async ({ input }) => nexareplyRepository.updateKnowledgeFact(await getScope(input), input.id, input)),
      archive: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), id: z.number().int().positive() })).mutation(async ({ input }) => nexareplyRepository.deleteKnowledgeFact(await getScope(input), input.id)),
    }),
    conversations: router({
      list: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), query: z.string().max(160).optional(), status: z.enum(["open", "pending", "closed"]).optional() }).optional()).query(async ({ input }) => nexareplyRepository.listConversations(await getScope(input ?? {}), input?.query, input?.status)),
      messages: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), conversationId: z.number().int().positive() })).query(async ({ input }) => nexareplyRepository.listMessages(await getScope(input), input.conversationId)),
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
      list: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => nexareplyRepository.listNotifications(await getScope(input ?? {}))),
      markRead: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), ids: z.array(z.number().int().positive()).optional() })).mutation(async ({ input }) => nexareplyRepository.markNotificationsRead(await getScope(input), input.ids)),
    }),
    analytics: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => nexareplyRepository.getAnalytics(await getScope(input ?? {}))),
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
      exportCsv: publicProcedure.input(z.object({ kind: z.enum(["leads", "orders"]) })).query(async ({ input }) => exportSalesCsv(await demoScope(), input.kind)),
    }),
  }),
  workspace: router({
    organizations: protectedProcedure.query(async ({ ctx }) => nexareplyRepository.listOrganizationsForUser(ctx.user.id)),
    bootstrap: protectedProcedure.mutation(async ({ ctx }) => nexareplyRepository.ensureWorkspaceForUser(ctx.user.id, ctx.user.name)),
    overview: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.getOverview(await workspaceScope(ctx.user.id, input.organizationId))),
    products: router({
      list: protectedProcedure.input(organizationInput.extend({ query: z.string().max(160).optional(), includeArchived: z.boolean().optional() })).query(async ({ ctx, input }) => nexareplyRepository.listProducts(await workspaceScope(ctx.user.id, input.organizationId), input.query, input.includeArchived)),
      create: protectedProcedure.input(organizationInput.extend({ product: productInput })).mutation(async ({ ctx, input }) => nexareplyRepository.createProduct(await workspaceScope(ctx.user.id, input.organizationId), input.product)),
      update: protectedProcedure.input(organizationInput.extend({ productId: z.number().int().positive(), patch: productInput.partial() })).mutation(async ({ ctx, input }) => nexareplyRepository.updateProduct(await workspaceScope(ctx.user.id, input.organizationId), input.productId, input.patch)),
      archive: protectedProcedure.input(organizationInput.extend({ productId: z.number().int().positive() })).mutation(async ({ ctx, input }) => nexareplyRepository.archiveProduct(await workspaceScope(ctx.user.id, input.organizationId), input.productId)),
    }),
    knowledge: router({
      list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listKnowledgeFacts(await workspaceScope(ctx.user.id, input.organizationId))),
      create: protectedProcedure.input(organizationInput.extend({ title: z.string().min(1).max(180), body: z.string().min(1), category: z.string().max(80).optional() })).mutation(async ({ ctx, input }) => nexareplyRepository.createKnowledgeFact(await workspaceScope(ctx.user.id, input.organizationId), input.title, input.body, input.category)),
      update: protectedProcedure.input(organizationInput.extend({ id: z.number().int().positive(), title: z.string().min(1).max(180), body: z.string().min(1), category: z.string().max(80).optional() })).mutation(async ({ ctx, input }) => nexareplyRepository.updateKnowledgeFact(await workspaceScope(ctx.user.id, input.organizationId), input.id, input)),
      archive: protectedProcedure.input(organizationInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => nexareplyRepository.deleteKnowledgeFact(await workspaceScope(ctx.user.id, input.organizationId), input.id)),
    }),
    conversations: router({
      list: protectedProcedure.input(organizationInput.extend({ query: z.string().max(160).optional(), status: z.enum(["open", "pending", "closed"]).optional() })).query(async ({ ctx, input }) => nexareplyRepository.listConversations(await workspaceScope(ctx.user.id, input.organizationId), input.query, input.status)),
      messages: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => nexareplyRepository.listMessages(await workspaceScope(ctx.user.id, input.organizationId), input.conversationId)),
      inboundDemo: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive(), body: z.string().min(1).max(2000), inboundEventId: z.string().min(8).max(160) })).mutation(async ({ ctx, input }) => recordInboundDemoMessage(await workspaceScope(ctx.user.id, input.organizationId), input)),
      createDraft: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => createDatabaseBackedDemoDraft(await workspaceScope(ctx.user.id, input.organizationId), input.conversationId)),
      takeover: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive(), active: z.boolean() })).mutation(async ({ ctx, input }) => nexareplyRepository.setHumanTakeover(await workspaceScope(ctx.user.id, input.organizationId), input.conversationId, input.active)),
      approveDraft: protectedProcedure.input(organizationInput.extend({ conversationId: z.number().int().positive(), body: z.string().min(1).max(2000) })).mutation(async ({ ctx, input }) => nexareplyRepository.addMessage(await workspaceScope(ctx.user.id, input.organizationId), { conversationId: input.conversationId, sender: "operator", body: input.body, source: "manual", approvedAt: new Date() })),
    }),
    leads: router({
      list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listLeads(await workspaceScope(ctx.user.id, input.organizationId))),
      updateStage: protectedProcedure.input(organizationInput.extend({ leadId: z.number().int().positive(), stage: z.enum(["new", "qualified", "negotiating", "draft_order", "closed_lost"]) })).mutation(async ({ ctx, input }) => nexareplyRepository.updateLeadStage(await workspaceScope(ctx.user.id, input.organizationId), input.leadId, input.stage)),
      draftOrders: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listDraftOrders(await workspaceScope(ctx.user.id, input.organizationId))),
    }),
    notifications: router({
      list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listNotifications(await workspaceScope(ctx.user.id, input.organizationId))),
      markRead: protectedProcedure.input(organizationInput.extend({ ids: z.array(z.number().int().positive()).optional() })).mutation(async ({ ctx, input }) => nexareplyRepository.markNotificationsRead(await workspaceScope(ctx.user.id, input.organizationId), input.ids)),
    }),
    analytics: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.getAnalytics(await workspaceScope(ctx.user.id, input.organizationId))),
    imports: router({
      preview: protectedProcedure.input(organizationInput.extend(uploadInput.shape)).mutation(async ({ ctx, input }) => previewCatalogImport(await workspaceScope(ctx.user.id, input.organizationId), input)),
      commit: protectedProcedure.input(organizationInput.extend(uploadInput.shape)).mutation(async ({ ctx, input }) => commitCatalogImport(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input)),
      exportCsv: protectedProcedure.input(organizationInput.extend({ kind: z.enum(["leads", "orders"]) })).query(async ({ ctx, input }) => exportSalesCsv(await workspaceScope(ctx.user.id, input.organizationId), input.kind)),
    }),
    owner: router({
      integrationStates: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listIntegrationStates(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
      meta: router({
        status: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => metaMessengerService.getConnectionStatus(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
        startOAuth: protectedProcedure.input(organizationInput).mutation(async ({ ctx, input }) => metaMessengerService.persistOAuthStart(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
        oauthPages: protectedProcedure.input(organizationInput.extend({ sessionId: z.string().min(16).max(64) })).query(async ({ ctx, input }) => metaMessengerService.getOAuthPages(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.sessionId)),
        selectPage: protectedProcedure.input(organizationInput.extend({ sessionId: z.string().min(16).max(64), pageId: z.string().min(1).max(80) })).mutation(async ({ ctx, input }) => metaMessengerService.selectPage(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input)),
        sendText: protectedProcedure.input(organizationInput.extend({ psid: z.string().min(1).max(160), text: z.string().min(1).max(2000) })).mutation(async ({ ctx, input }) => metaMessengerService.sendText(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input)),
      }),
    }),
    memberships: router({
      list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => nexareplyRepository.listMemberships(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
      setRole: protectedProcedure.input(organizationInput.extend({ userId: z.number().int().positive(), role: z.enum(["owner", "operator"]) })).mutation(async ({ ctx, input }) => nexareplyRepository.setMembershipRole(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.userId, input.role)),
      invitations: router({
        list: protectedProcedure.input(organizationInput).query(async ({ ctx, input }) => invitationService.listForOwner(await workspaceScope(ctx.user.id, input.organizationId, "owner"))),
        create: protectedProcedure.input(organizationInput.extend({ email: z.string().trim().email().max(320) })).mutation(async ({ ctx, input }) => invitationService.create(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.email)),
        cancel: protectedProcedure.input(organizationInput.extend({ invitationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => invitationService.cancel(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.invitationId)),
        resend: protectedProcedure.input(organizationInput.extend({ invitationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => invitationService.resend(await workspaceScope(ctx.user.id, input.organizationId, "owner"), input.invitationId)),
      }),
    }),
  }),
});
