import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import {
  auditEvents,
  backgroundJobs,
  conversationParticipants,
  conversations,
  draftOrders,
  integrationSettings,
  knowledgeFacts,
  knowledgeDraftFacts,
  knowledgeSources,
  leads,
  metaConnections,
  metaOauthSessions,
  metaWebhookEvents,
  messages,
  notifications,
  orderItems,
  organizationInvitations,
  organizationMemberships,
  organizationOnboarding,
  organizations,
  plans,
  productImports,
  productAssets,
  productVariants,
  products,
  tickets,
  usageCounters,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";

export type WorkspaceRole = "owner" | "operator";
export type WorkspaceScope = { organizationId: number; role: WorkspaceRole; isDemo: boolean; actorUserId?: number };
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

const DEMO_SLUG = "amadeo-perfume-demo";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db;
}

async function ensureOnboarding(scope: WorkspaceScope) {
  const db = await requireDb();
  const existing = (await db.select().from(organizationOnboarding)
    .where(eq(organizationOnboarding.organizationId, scope.organizationId)).limit(1))[0];
  if (existing) return existing;
  await db.insert(organizationOnboarding).values({ organizationId: scope.organizationId });
  return (await db.select().from(organizationOnboarding)
    .where(eq(organizationOnboarding.organizationId, scope.organizationId)).limit(1))[0]!;
}

export const nexareplyRepository = {
  async getOrganizationBySlug(slug: string) {
    const db = await requireDb();
    return (await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1))[0];
  },

  async getPublicDemoScope(): Promise<WorkspaceScope> {
    const organization = await this.getOrganizationBySlug(DEMO_SLUG);
    if (!organization || organization.mode !== "demo") throw new Error("Demo organization is not initialized");
    return { organizationId: organization.id, role: "owner", isDemo: true };
  },

  async getWorkspaceScope(userId: number, organizationId: number): Promise<WorkspaceScope | null> {
    const db = await requireDb();
    const membership = (await db.select().from(organizationMemberships).where(and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.userId, userId),
    )).limit(1))[0];
    if (!membership) return null;
    return { organizationId, role: membership.role, isDemo: false, actorUserId: userId };
  },

  async listOrganizationsForUser(userId: number) {
    const db = await requireDb();
    return db.select({ organization: organizations, membership: organizationMemberships })
      .from(organizationMemberships)
      .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
      .where(eq(organizationMemberships.userId, userId));
  },

  async ensureWorkspaceForUser(userId: number, userName?: string | null) {
    const existing = await this.listOrganizationsForUser(userId);
    if (existing.length) return existing;
    const db = await requireDb();
    const plan = await this.ensurePlan();
    const slug = `workspace-${userId}`;
    await db.insert(organizations).values({ name: `${userName?.trim() || "ჩემი"} Workspace`, slug, mode: "live", planId: plan.id });
    const organization = (await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1))[0];
    if (!organization) throw new Error("Workspace bootstrap failed");
    await db.insert(organizationMemberships).values({ organizationId: organization.id, userId, role: "owner" });
    await this.ensureIntegrationStates({ organizationId: organization.id, role: "owner", isDemo: false, actorUserId: userId });
    return this.listOrganizationsForUser(userId);
  },

  async listMemberships(scope: WorkspaceScope) {
    const db = await requireDb();
    return db.select({ membership: organizationMemberships, user: users })
      .from(organizationMemberships)
      .innerJoin(users, eq(organizationMemberships.userId, users.id))
      .where(eq(organizationMemberships.organizationId, scope.organizationId));
  },

  async setMembershipRole(scope: WorkspaceScope, userId: number, role: WorkspaceRole) {
    if (scope.actorUserId === userId && role !== "owner") throw new Error("ორგანიზაციის ერთადერთი მფლობელის როლის შემცირება დაუშვებელია.");
    const db = await requireDb();
    const member = (await db.select().from(organizationMemberships).where(and(eq(organizationMemberships.organizationId, scope.organizationId), eq(organizationMemberships.userId, userId))).limit(1))[0];
    if (!member) throw new Error("ორგანიზაციის წევრი ვერ მოიძებნა.");
    await db.update(organizationMemberships).set({ role }).where(eq(organizationMemberships.id, member.id));
    await this.addAudit(scope, "membership.role_updated", "membership", String(member.id), { userId, role });
    return { ...member, role };
  },

  async expireDueInvitations(organizationId?: number) {
    const db = await requireDb();
    const conditions = [eq(organizationInvitations.status, "pending"), sql`${organizationInvitations.expiresAt} <= now()`];
    if (organizationId) conditions.push(eq(organizationInvitations.organizationId, organizationId));
    await db.update(organizationInvitations).set({ status: "expired", activeEmailKey: null }).where(and(...conditions));
  },

  async listInvitations(scope: WorkspaceScope) {
    await this.expireDueInvitations(scope.organizationId);
    const db = await requireDb();
    return db.select().from(organizationInvitations).where(eq(organizationInvitations.organizationId, scope.organizationId)).orderBy(desc(organizationInvitations.createdAt));
  },

  async createInvitation(scope: WorkspaceScope, input: { email: string; normalizedEmail: string; tokenHash: string; expiresAt: Date }) {
    const db = await requireDb();
    const activeEmailKey = `${scope.organizationId}:${input.normalizedEmail}`;
    const existing = (await db.select().from(organizationInvitations).where(eq(organizationInvitations.activeEmailKey, activeEmailKey)).limit(1))[0];
    if (existing) await db.update(organizationInvitations).set({ status: "cancelled", activeEmailKey: null, cancelledAt: new Date() }).where(eq(organizationInvitations.id, existing.id));
    await db.insert(organizationInvitations).values({ organizationId: scope.organizationId, email: input.email, normalizedEmail: input.normalizedEmail, tokenHash: input.tokenHash, activeEmailKey, invitedByUserId: scope.actorUserId!, expiresAt: input.expiresAt });
    const invitation = (await db.select().from(organizationInvitations).where(and(eq(organizationInvitations.organizationId, scope.organizationId), eq(organizationInvitations.tokenHash, input.tokenHash))).limit(1))[0];
    if (!invitation) throw new Error("Invitation could not be created.");
    await this.addAudit(scope, "invitation.created", "organization_invitation", String(invitation.id), { email: input.normalizedEmail, role: invitation.role });
    return invitation;
  },

  async setInvitationDelivery(scope: WorkspaceScope, invitationId: number, input: { status: "manual_ready" | "sent" | "delivery_failed"; providerMessageId?: string | null; lastError?: string | null }) {
    const db = await requireDb();
    await db.update(organizationInvitations).set({ deliveryStatus: input.status, providerMessageId: input.providerMessageId ?? null, lastError: input.lastError ?? null, ...(input.status === "sent" ? { sentAt: new Date() } : {}) }).where(and(eq(organizationInvitations.id, invitationId), eq(organizationInvitations.organizationId, scope.organizationId)));
    return (await db.select().from(organizationInvitations).where(and(eq(organizationInvitations.id, invitationId), eq(organizationInvitations.organizationId, scope.organizationId))).limit(1))[0];
  },

  async cancelInvitation(scope: WorkspaceScope, invitationId: number) {
    const db = await requireDb();
    const invitation = (await db.select().from(organizationInvitations).where(and(eq(organizationInvitations.id, invitationId), eq(organizationInvitations.organizationId, scope.organizationId))).limit(1))[0];
    if (!invitation) throw new Error("Invitation not found.");
    if (invitation.status !== "pending") return invitation;
    await db.update(organizationInvitations).set({ status: "cancelled", activeEmailKey: null, cancelledAt: new Date() }).where(eq(organizationInvitations.id, invitation.id));
    await this.addAudit(scope, "invitation.cancelled", "organization_invitation", String(invitation.id), { email: invitation.normalizedEmail });
    return (await db.select().from(organizationInvitations).where(eq(organizationInvitations.id, invitation.id)).limit(1))[0]!;
  },

  async getInvitation(scope: WorkspaceScope, invitationId: number) {
    const db = await requireDb();
    return (await db.select().from(organizationInvitations).where(and(eq(organizationInvitations.id, invitationId), eq(organizationInvitations.organizationId, scope.organizationId))).limit(1))[0];
  },

  async getInvitationByTokenHash(tokenHash: string) {
    await this.expireDueInvitations();
    const db = await requireDb();
    return (await db.select({ invitation: organizationInvitations, organization: organizations }).from(organizationInvitations).innerJoin(organizations, eq(organizationInvitations.organizationId, organizations.id)).where(eq(organizationInvitations.tokenHash, tokenHash)).limit(1))[0];
  },

  async acceptInvitation(input: { tokenHash: string; userId: number; normalizedUserEmail: string }) {
    await this.expireDueInvitations();
    const db = await requireDb();
    const record = await this.getInvitationByTokenHash(input.tokenHash);
    if (!record) throw new Error("Invitation is invalid or has expired.");
    const { invitation, organization } = record;
    if (invitation.status !== "pending" || invitation.normalizedEmail !== input.normalizedUserEmail) throw new Error("Invitation is invalid for this account.");
    const existingMembership = (await db.select().from(organizationMemberships).where(and(eq(organizationMemberships.organizationId, invitation.organizationId), eq(organizationMemberships.userId, input.userId))).limit(1))[0];
    if (!existingMembership) await db.insert(organizationMemberships).values({ organizationId: invitation.organizationId, userId: input.userId, role: invitation.role });
    await db.update(organizationInvitations).set({ status: "accepted", activeEmailKey: null, acceptedAt: new Date() }).where(and(eq(organizationInvitations.id, invitation.id), eq(organizationInvitations.status, "pending")));
    await db.insert(auditEvents).values({ organizationId: invitation.organizationId, actorUserId: input.userId, action: "invitation.accepted", targetType: "organization_invitation", targetId: String(invitation.id), payload: { invitedEmail: invitation.normalizedEmail, invitedByUserId: invitation.invitedByUserId } });
    return { invitationId: invitation.id, organizationId: invitation.organizationId, organizationName: organization.name, role: invitation.role, alreadyMember: Boolean(existingMembership) };
  },

  async listProducts(scope: WorkspaceScope, query?: string, includeArchived = false) {
    const db = await requireDb();
    const conditions = [eq(products.organizationId, scope.organizationId)];
    if (!includeArchived) conditions.push(eq(products.active, true));
    if (query?.trim()) {
      const term = `%${query.trim()}%`;
      conditions.push(or(like(products.brand, term), like(products.model, term), like(productVariants.color, term))!);
    }
    return db.select({ product: products, variant: productVariants })
      .from(products)
      .innerJoin(productVariants, and(eq(productVariants.productId, products.id), eq(productVariants.organizationId, scope.organizationId)))
      .where(and(...conditions))
      .orderBy(asc(products.brand), asc(products.model));
  },

  async listProductAssets(scope: WorkspaceScope, productId?: number) {
    const db = await requireDb();
    const conditions = [eq(productAssets.organizationId, scope.organizationId), sql`${productAssets.deletedAt} is null`];
    if (productId) conditions.push(eq(productAssets.productId, productId));
    return db.select().from(productAssets).where(and(...conditions)).orderBy(asc(productAssets.productId), desc(productAssets.isPrimary), asc(productAssets.sortOrder), asc(productAssets.id));
  },

  async createProductAsset(scope: WorkspaceScope, input: { productId: number; storageKey: string; mimeType: string; byteSize: number; width: number; height: number; altText?: string | null }) {
    const db = await requireDb();
    const product = (await db.select().from(products).where(and(eq(products.id, input.productId), eq(products.organizationId, scope.organizationId))).limit(1))[0];
    if (!product) throw new Error("Product not found.");
    const activeAssets = await this.listProductAssets(scope, input.productId);
    if (activeAssets.length >= 6) throw new Error("ერთ პროდუქტს მაქსიმუმ 6 ფოტო შეიძლება ჰქონდეს.");
    const isPrimary = activeAssets.length === 0;
    if (isPrimary) await db.update(productAssets).set({ isPrimary: false }).where(and(eq(productAssets.organizationId, scope.organizationId), eq(productAssets.productId, input.productId)));
    await db.insert(productAssets).values({ ...input, organizationId: scope.organizationId, createdByUserId: scope.actorUserId, sortOrder: activeAssets.length, isPrimary });
    const asset = (await db.select().from(productAssets).where(and(eq(productAssets.organizationId, scope.organizationId), eq(productAssets.storageKey, input.storageKey))).limit(1))[0];
    if (!asset) throw new Error("Product image record could not be saved.");
    await this.addAudit(scope, "product_asset.created", "product_asset", String(asset.id), { productId: input.productId, mimeType: input.mimeType, byteSize: input.byteSize, width: input.width, height: input.height });
    return asset;
  },

  async updateProductAsset(scope: WorkspaceScope, assetId: number, input: { altText?: string | null; sortOrder?: number; isPrimary?: boolean }) {
    const db = await requireDb();
    const asset = (await db.select().from(productAssets).where(and(eq(productAssets.id, assetId), eq(productAssets.organizationId, scope.organizationId), sql`${productAssets.deletedAt} is null`)).limit(1))[0];
    if (!asset) throw new Error("Product image not found.");
    if (input.isPrimary) await db.update(productAssets).set({ isPrimary: false }).where(and(eq(productAssets.organizationId, scope.organizationId), eq(productAssets.productId, asset.productId), sql`${productAssets.deletedAt} is null`));
    const patch: Record<string, unknown> = {};
    if (input.altText !== undefined) patch.altText = input.altText;
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    if (input.isPrimary !== undefined) patch.isPrimary = input.isPrimary;
    if (Object.keys(patch).length) await db.update(productAssets).set(patch).where(and(eq(productAssets.id, assetId), eq(productAssets.organizationId, scope.organizationId)));
    await this.addAudit(scope, "product_asset.updated", "product_asset", String(assetId), { productId: asset.productId, changed: Object.keys(patch) });
    return (await db.select().from(productAssets).where(and(eq(productAssets.id, assetId), eq(productAssets.organizationId, scope.organizationId))).limit(1))[0]!;
  },

  async archiveProductAsset(scope: WorkspaceScope, assetId: number) {
    const db = await requireDb();
    const asset = (await db.select().from(productAssets).where(and(eq(productAssets.id, assetId), eq(productAssets.organizationId, scope.organizationId), sql`${productAssets.deletedAt} is null`)).limit(1))[0];
    if (!asset) throw new Error("Product image not found.");
    await db.update(productAssets).set({ deletedAt: new Date(), isPrimary: false }).where(and(eq(productAssets.id, assetId), eq(productAssets.organizationId, scope.organizationId)));
    const remaining = await this.listProductAssets(scope, asset.productId);
    if (asset.isPrimary && remaining[0]) await db.update(productAssets).set({ isPrimary: true }).where(and(eq(productAssets.id, remaining[0].id), eq(productAssets.organizationId, scope.organizationId)));
    await this.addAudit(scope, "product_asset.archived", "product_asset", String(assetId), { productId: asset.productId });
  },

  async getOverview(scope: WorkspaceScope) {
    const db = await requireDb();
    const organization = await this.getOrganization(scope);
    const [conversationCount] = await db.select({ value: sql<number>`count(*)` }).from(conversations).where(eq(conversations.organizationId, scope.organizationId));
    const [ticketCount] = await db.select({ value: sql<number>`count(*)` }).from(tickets).where(and(eq(tickets.organizationId, scope.organizationId), eq(tickets.status, "open")));
    const [leadCount] = await db.select({ value: sql<number>`count(*)` }).from(leads).where(and(eq(leads.organizationId, scope.organizationId), eq(leads.stage, "qualified")));
    const usage = await this.ensureUsageCounter(scope, new Date().toISOString().slice(0, 7));
    return {
      organization,
      conversationCount: Number(conversationCount?.value ?? 0),
      ticketCount: Number(ticketCount?.value ?? 0),
      qualifiedLeadCount: Number(leadCount?.value ?? 0),
      usage,
    };
  },

  async getOnboarding(scope: WorkspaceScope) {
    const db = await requireDb();
    const onboarding = await ensureOnboarding(scope);
    const count = async (table: any, where: any) => {
      const [row] = await db.select({ value: sql<number>`count(*)` }).from(table).where(where);
      return Number(row?.value ?? 0);
    };
    const [connection] = await db.select().from(metaConnections)
      .where(eq(metaConnections.organizationId, scope.organizationId)).limit(1);
    const productCount = await count(products, and(eq(products.organizationId, scope.organizationId), eq(products.active, true)));
    const knowledgeCount = await count(knowledgeFacts, and(eq(knowledgeFacts.organizationId, scope.organizationId), eq(knowledgeFacts.active, true)));
    const testDraftCount = await count(messages, and(eq(messages.organizationId, scope.organizationId), eq(messages.isDraft, true)));
    const completedCount = [connection?.status === "connected", knowledgeCount > 0, productCount > 0, Boolean(onboarding.assistantReviewedAt), testDraftCount > 0].filter(Boolean).length;
    return {
      dismissedAt: onboarding.dismissedAt,
      assistantReviewedAt: onboarding.assistantReviewedAt,
      workerReady: false as const,
      completedCount,
      totalActionableSteps: 5,
      steps: {
        channelConnected: connection?.status === "connected",
        knowledgeReady: knowledgeCount > 0,
        catalogReady: productCount > 0,
        assistantReviewed: Boolean(onboarding.assistantReviewedAt),
        testDraftReady: testDraftCount > 0,
      },
    };
  },

  async dismissOnboarding(scope: WorkspaceScope) {
    const db = await requireDb();
    await ensureOnboarding(scope);
    await db.update(organizationOnboarding).set({ dismissedAt: new Date(), dismissedByUserId: scope.actorUserId ?? null })
      .where(eq(organizationOnboarding.organizationId, scope.organizationId));
    await this.addAudit(scope, "onboarding.dismissed", "organization_onboarding", String(scope.organizationId), {});
    return this.getOnboarding(scope);
  },

  async restartOnboarding(scope: WorkspaceScope) {
    const db = await requireDb();
    await ensureOnboarding(scope);
    await db.update(organizationOnboarding).set({ dismissedAt: null, dismissedByUserId: null })
      .where(eq(organizationOnboarding.organizationId, scope.organizationId));
    await this.addAudit(scope, "onboarding.restarted", "organization_onboarding", String(scope.organizationId), {});
    return this.getOnboarding(scope);
  },

  async getAnalytics(scope: WorkspaceScope) {
    const db = await requireDb();
    const queryCount = async (table: any, where: any) => {
      const [row] = await db.select({ value: sql<number>`count(*)` }).from(table).where(where);
      return Number(row?.value ?? 0);
    };
    const conversationCount = await queryCount(conversations, eq(conversations.organizationId, scope.organizationId));
    const aiReplies = await queryCount(messages, and(eq(messages.organizationId, scope.organizationId), eq(messages.sender, "ai")));
    const humanReplies = await queryCount(messages, and(eq(messages.organizationId, scope.organizationId), eq(messages.sender, "operator")));
    const qualifiedLeads = await queryCount(leads, and(eq(leads.organizationId, scope.organizationId), eq(leads.stage, "qualified")));
    const handoffs = await queryCount(conversations, and(eq(conversations.organizationId, scope.organizationId), sql`(${conversations.humanActive} = true or ${conversations.aiState} = 'needs_human')`));
    const draftOrderCount = await queryCount(draftOrders, eq(draftOrders.organizationId, scope.organizationId));
    const dailyRows = await db.select({ sender: messages.sender, createdAt: messages.createdAt }).from(messages).where(eq(messages.organizationId, scope.organizationId));
    const days = new Map<string, { day: string; ai: number; human: number }>();
    dailyRows.forEach((row) => {
      const day = new Date(row.createdAt).toLocaleDateString("en-US", { weekday: "short" });
      const current = days.get(day) ?? { day, ai: 0, human: 0 };
      if (row.sender === "ai") current.ai += 1;
      if (row.sender === "operator") current.human += 1;
      days.set(day, current);
    });
    return { conversationCount, aiReplies, humanReplies, qualifiedLeads, handoffs, draftOrderCount, responseRate: conversationCount ? Math.round(((aiReplies + humanReplies) / conversationCount) * 100) : 0, dailyVolume: Array.from(days.values()) };
  },

  async createProduct(scope: WorkspaceScope, input: { brand: string; fragranceName?: string; model?: string; sku: string; volume?: string; storage?: string; availability?: string; color?: string; description?: string; priceGel: string; stock: number; installment?: string; warranty?: string }) {
    const db = await requireDb();
    const fragranceName = input.fragranceName ?? input.model;
    if (!fragranceName) throw new Error("სურნელის დასახელება სავალდებულოა.");
    await db.insert(products).values({ organizationId: scope.organizationId, brand: input.brand, model: fragranceName, sku: input.sku, category: "სუნამო", description: input.description?.trim() || "აღწერა ჯერ არ არის დამატებული." });
    const product = (await db.select().from(products).where(and(eq(products.organizationId, scope.organizationId), eq(products.sku, input.sku))).limit(1))[0];
    if (!product) throw new Error("Product creation failed");
    await db.insert(productVariants).values({
      organizationId: scope.organizationId,
      productId: product.id,
      sku: `${input.sku}-default`,
      storage: input.volume?.trim() || input.storage?.trim() || "მოცულობა არ არის მითითებული",
      color: input.availability?.trim() || input.color?.trim() || "ხელმისაწვდომობის დაზუსტება საჭიროა",
      priceGel: input.priceGel,
      stock: input.stock,
      installment: input.installment?.trim() || "პირობები მენეჯერთან დაზუსტდება",
      warranty: input.warranty?.trim() || "ორიგინალობა დასტურდება მაღაზიის პოლიტიკით",
    });
    await this.addAudit(scope, "product.created", "product", String(product.id), { sku: input.sku });
    return product;
  },

  async createProductImport(scope: WorkspaceScope, input: { fileName: string; format: "csv" | "xlsx"; status: "preview" | "completed" | "failed"; validRows: number; invalidRows: number; errors: unknown }) {
    const db = await requireDb();
    await db.insert(productImports).values({ organizationId: scope.organizationId, createdByUserId: scope.actorUserId, fileName: input.fileName, format: input.format, status: input.status, validRows: input.validRows, invalidRows: input.invalidRows, errors: input.errors as Record<string, unknown> });
    const record = (await db.select().from(productImports).where(and(eq(productImports.organizationId, scope.organizationId), eq(productImports.fileName, input.fileName))).orderBy(desc(productImports.id)).limit(1))[0];
    if (!record) throw new Error("Import preview could not be created");
    return record.id;
  },

  async finishProductImport(scope: WorkspaceScope, importId: number, validRows: number, errors: unknown) {
    const db = await requireDb();
    const errorRows = Array.isArray(errors) ? errors.length : 0;
    await db.update(productImports).set({ status: errorRows ? "failed" : "completed", validRows, invalidRows: errorRows, errors: errors as Record<string, unknown> }).where(and(eq(productImports.id, importId), eq(productImports.organizationId, scope.organizationId)));
    await this.addAudit(scope, "product_import.completed", "product_import", String(importId), { validRows, invalidRows: errorRows });
  },

  async listProductImports(scope: WorkspaceScope) {
    const db = await requireDb();
    return db.select().from(productImports).where(eq(productImports.organizationId, scope.organizationId)).orderBy(desc(productImports.createdAt)).limit(12);
  },

  async updateProduct(scope: WorkspaceScope, productId: number, input: Partial<{ brand: string; fragranceName: string; model: string; volume: string; storage: string; availability: string; color: string; description: string; priceGel: string; stock: number; installment: string; warranty: string }>) {
    const db = await requireDb();
    const current = (await db.select().from(products).where(and(eq(products.id, productId), eq(products.organizationId, scope.organizationId))).limit(1))[0];
    if (!current) throw new Error("Product not found");
    const productPatch: Record<string, unknown> = {};
    if (input.brand) productPatch.brand = input.brand;
    if (input.fragranceName ?? input.model) productPatch.model = input.fragranceName ?? input.model;
    if (input.description !== undefined) productPatch.description = input.description;
    if (Object.keys(productPatch).length) await db.update(products).set(productPatch).where(and(eq(products.id, productId), eq(products.organizationId, scope.organizationId)));
    const variantPatch: Record<string, unknown> = {};
    if (input.volume !== undefined) variantPatch.storage = input.volume;
    else if (input.storage !== undefined) variantPatch.storage = input.storage;
    if (input.availability !== undefined) variantPatch.color = input.availability;
    else if (input.color !== undefined) variantPatch.color = input.color;
    (["storage", "color", "priceGel", "stock", "installment", "warranty"] as const).forEach((key) => {
      if (input[key] !== undefined) variantPatch[key] = input[key];
    });
    if (Object.keys(variantPatch).length) await db.update(productVariants).set(variantPatch).where(and(eq(productVariants.productId, productId), eq(productVariants.organizationId, scope.organizationId)));
    await this.addAudit(scope, "product.updated", "product", String(productId), input);
  },

  async archiveProduct(scope: WorkspaceScope, productId: number) {
    const db = await requireDb();
    await db.update(products).set({ active: false, archivedAt: new Date() }).where(and(eq(products.id, productId), eq(products.organizationId, scope.organizationId)));
    await db.update(productVariants).set({ active: false }).where(and(eq(productVariants.productId, productId), eq(productVariants.organizationId, scope.organizationId)));
    await this.addAudit(scope, "product.archived", "product", String(productId), {});
  },

  async listKnowledgeFacts(scope: WorkspaceScope) {
    const db = await requireDb();
    return db.select().from(knowledgeFacts).where(and(eq(knowledgeFacts.organizationId, scope.organizationId), eq(knowledgeFacts.active, true))).orderBy(asc(knowledgeFacts.id));
  },

  async createKnowledgeFact(scope: WorkspaceScope, title: string, body: string, category = "general") {
    const db = await requireDb();
    await db.insert(knowledgeFacts).values({ organizationId: scope.organizationId, title, body, category });
    await this.addAudit(scope, "knowledge.created", "knowledge_fact", title, {});
  },

  async updateKnowledgeFact(scope: WorkspaceScope, id: number, input: { title: string; body: string; category?: string }) {
    const db = await requireDb();
    await db.update(knowledgeFacts).set({ title: input.title, body: input.body, category: input.category ?? "general" }).where(and(eq(knowledgeFacts.id, id), eq(knowledgeFacts.organizationId, scope.organizationId)));
    await this.addAudit(scope, "knowledge.updated", "knowledge_fact", String(id), {});
  },

  async deleteKnowledgeFact(scope: WorkspaceScope, id: number) {
    const db = await requireDb();
    await db.update(knowledgeFacts).set({ active: false }).where(and(eq(knowledgeFacts.id, id), eq(knowledgeFacts.organizationId, scope.organizationId)));
    await this.addAudit(scope, "knowledge.archived", "knowledge_fact", String(id), {});
  },

  async createKnowledgeSourceWithDrafts(scope: WorkspaceScope, input: { title: string; originalText: string; items: Array<{ title: string; body: string; category: string; confidence: number }> }) {
    const db = await requireDb();
    await db.insert(knowledgeSources).values({ organizationId: scope.organizationId, title: input.title, originalText: input.originalText, createdByUserId: scope.actorUserId });
    const source = (await db.select().from(knowledgeSources).where(and(eq(knowledgeSources.organizationId, scope.organizationId), eq(knowledgeSources.title, input.title))).orderBy(desc(knowledgeSources.id)).limit(1))[0];
    if (!source) throw new Error("Knowledge source could not be saved.");
    if (input.items.length) await db.insert(knowledgeDraftFacts).values(input.items.map((item) => ({ organizationId: scope.organizationId, sourceId: source.id, ...item, status: "pending" as const })));
    await this.addAudit(scope, "knowledge_draft.generated", "knowledge_source", String(source.id), { itemCount: input.items.length });
    return source;
  },

  async listKnowledgeDrafts(scope: WorkspaceScope) {
    const db = await requireDb();
    return db.select({ source: knowledgeSources, draft: knowledgeDraftFacts })
      .from(knowledgeDraftFacts)
      .innerJoin(knowledgeSources, and(eq(knowledgeDraftFacts.sourceId, knowledgeSources.id), eq(knowledgeSources.organizationId, scope.organizationId)))
      .where(eq(knowledgeDraftFacts.organizationId, scope.organizationId))
      .orderBy(desc(knowledgeSources.createdAt), asc(knowledgeDraftFacts.id));
  },

  async approveKnowledgeDrafts(scope: WorkspaceScope, sourceId: number, draftIds: number[]) {
    const db = await requireDb();
    const source = (await db.select().from(knowledgeSources).where(and(eq(knowledgeSources.id, sourceId), eq(knowledgeSources.organizationId, scope.organizationId))).limit(1))[0];
    if (!source || source.status === "archived") throw new Error("Knowledge source not found.");
    const pending = (await db.select().from(knowledgeDraftFacts).where(and(eq(knowledgeDraftFacts.organizationId, scope.organizationId), eq(knowledgeDraftFacts.sourceId, sourceId), sql`${knowledgeDraftFacts.status} = 'pending'`)));
    const selected = pending.filter((draft) => draftIds.includes(draft.id));
    if (!selected.length) throw new Error("დასამტკიცებელი draft ვერ მოიძებნა.");
    const now = new Date();
    for (const draft of selected) {
      await db.insert(knowledgeFacts).values({ organizationId: scope.organizationId, title: draft.title, body: draft.body, category: draft.category, active: true });
      const fact = (await db.select().from(knowledgeFacts).where(and(eq(knowledgeFacts.organizationId, scope.organizationId), eq(knowledgeFacts.title, draft.title), eq(knowledgeFacts.body, draft.body))).orderBy(desc(knowledgeFacts.id)).limit(1))[0];
      await db.update(knowledgeDraftFacts).set({ status: "approved", approvedKnowledgeFactId: fact?.id ?? null, reviewedByUserId: scope.actorUserId, reviewedAt: now }).where(and(eq(knowledgeDraftFacts.id, draft.id), eq(knowledgeDraftFacts.organizationId, scope.organizationId)));
    }
    const remaining = pending.length - selected.length;
    await db.update(knowledgeSources).set({ status: remaining ? "partially_approved" : "approved", approvedByUserId: scope.actorUserId, approvedAt: remaining ? null : now }).where(and(eq(knowledgeSources.id, sourceId), eq(knowledgeSources.organizationId, scope.organizationId)));
    await this.addAudit(scope, "knowledge_draft.approved", "knowledge_source", String(sourceId), { approvedDraftIds: selected.map((draft) => draft.id) });
    return this.listKnowledgeDrafts(scope);
  },

  async rejectKnowledgeDraft(scope: WorkspaceScope, draftId: number) {
    const db = await requireDb();
    const draft = (await db.select().from(knowledgeDraftFacts).where(and(eq(knowledgeDraftFacts.id, draftId), eq(knowledgeDraftFacts.organizationId, scope.organizationId), sql`${knowledgeDraftFacts.status} = 'pending'`)).limit(1))[0];
    if (!draft) throw new Error("Knowledge draft not found.");
    await db.update(knowledgeDraftFacts).set({ status: "rejected", reviewedByUserId: scope.actorUserId, reviewedAt: new Date() }).where(and(eq(knowledgeDraftFacts.id, draftId), eq(knowledgeDraftFacts.organizationId, scope.organizationId)));
    await this.addAudit(scope, "knowledge_draft.rejected", "knowledge_draft_fact", String(draftId), { sourceId: draft.sourceId });
  },

  async updateKnowledgeDraft(scope: WorkspaceScope, draftId: number, input: { title: string; body: string; category: string }) {
    const db = await requireDb();
    const draft = (await db.select().from(knowledgeDraftFacts).where(and(eq(knowledgeDraftFacts.id, draftId), eq(knowledgeDraftFacts.organizationId, scope.organizationId), sql`${knowledgeDraftFacts.status} = 'pending'`)).limit(1))[0];
    if (!draft) throw new Error("Knowledge draft not found.");
    await db.update(knowledgeDraftFacts).set(input).where(and(eq(knowledgeDraftFacts.id, draftId), eq(knowledgeDraftFacts.organizationId, scope.organizationId)));
    await this.addAudit(scope, "knowledge_draft.updated", "knowledge_draft_fact", String(draftId), { sourceId: draft.sourceId });
    return (await db.select().from(knowledgeDraftFacts).where(and(eq(knowledgeDraftFacts.id, draftId), eq(knowledgeDraftFacts.organizationId, scope.organizationId))).limit(1))[0]!;
  },

  async listConversations(scope: WorkspaceScope, query?: string, status?: "open" | "pending" | "closed") {
    const db = await requireDb();
    const conditions = [eq(conversations.organizationId, scope.organizationId)];
    if (query?.trim()) {
      const term = `%${query.trim()}%`;
      conditions.push(or(like(conversations.customerName, term), like(conversations.customerPhone, term), like(conversations.preview, term))!);
    }
    if (status) conditions.push(eq(conversations.status, status));
    return db.select().from(conversations).where(and(...conditions)).orderBy(desc(conversations.updatedAt));
  },

  async listMessages(scope: WorkspaceScope, conversationId: number) {
    const db = await requireDb();
    return db.select().from(messages).where(and(eq(messages.organizationId, scope.organizationId), eq(messages.conversationId, conversationId))).orderBy(asc(messages.createdAt));
  },

  async addMessage(scope: WorkspaceScope, input: { conversationId: number; sender: "customer" | "ai" | "operator" | "system"; body: string; source: "demo" | "manual" | "ai" | "meta" | "system"; inboundEventId?: string; isDraft?: boolean; approvedAt?: Date | null; deliveryStatus?: "received" | "draft" | "queued" | "sent" | "failed" }) {
    const db = await requireDb();
    const deliveryStatus = input.deliveryStatus ?? (input.isDraft ? "draft" : input.sender === "customer" ? "received" : "sent");
    await db.insert(messages).values({ organizationId: scope.organizationId, ...input, deliveryStatus });
    await db.update(conversations).set({ preview: input.body, lastMessageAt: new Date(), ...(input.sender === "customer" ? { lastInboundAt: new Date() } : {}) }).where(and(eq(conversations.id, input.conversationId), eq(conversations.organizationId, scope.organizationId)));
  },

  async setHumanTakeover(scope: WorkspaceScope, conversationId: number, active: boolean) {
    const db = await requireDb();
    await db.update(conversations).set({ humanActive: active, aiState: active ? "paused" : "active", status: active ? "pending" : "open" }).where(and(eq(conversations.id, conversationId), eq(conversations.organizationId, scope.organizationId)));
    await this.addMessage(scope, { conversationId, sender: "system", source: "system", body: active ? "ადამიანმა ჩაიბარა საუბარი" : "AI პასუხები განახლდა" });
    await this.addAudit(scope, active ? "conversation.human_takeover" : "conversation.ai_resumed", "conversation", String(conversationId), {});
  },

  async pauseAiForNeedsHuman(scope: WorkspaceScope, conversationId: number) {
    const db = await requireDb();
    await db.update(conversations).set({ aiState: "needs_human", status: "pending" }).where(and(eq(conversations.id, conversationId), eq(conversations.organizationId, scope.organizationId)));
  },

  async getActiveTicket(scope: WorkspaceScope, conversationId: number) {
    const db = await requireDb();
    return (await db.select().from(tickets).where(and(eq(tickets.organizationId, scope.organizationId), eq(tickets.conversationId, conversationId), eq(tickets.status, "open"))).limit(1))[0];
  },

  async createTicketOnce(scope: WorkspaceScope, conversationId: number, reason: string, priority: "normal" | "high", idempotencyKey: string) {
    const db = await requireDb();
    const found = (await db.select().from(tickets).where(and(eq(tickets.organizationId, scope.organizationId), eq(tickets.idempotencyKey, idempotencyKey))).limit(1))[0];
    if (found) return found;
    await db.insert(tickets).values({ organizationId: scope.organizationId, conversationId, reason, priority, idempotencyKey });
    const ticket = (await db.select().from(tickets).where(and(eq(tickets.organizationId, scope.organizationId), eq(tickets.idempotencyKey, idempotencyKey))).limit(1))[0];
    await db.update(conversations).set({ status: "pending", aiState: "needs_human" }).where(and(eq(conversations.id, conversationId), eq(conversations.organizationId, scope.organizationId)));
    return ticket;
  },

  async listTickets(scope: WorkspaceScope, status?: "open" | "resolved" | "closed") {
    const db = await requireDb();
    const conditions = [eq(tickets.organizationId, scope.organizationId)];
    if (status) conditions.push(eq(tickets.status, status));
    return db.select({ ticket: tickets, conversation: conversations })
      .from(tickets)
      .innerJoin(conversations, and(eq(tickets.conversationId, conversations.id), eq(conversations.organizationId, scope.organizationId)))
      .where(and(...conditions))
      .orderBy(desc(tickets.updatedAt));
  },

  async resolveTicket(scope: WorkspaceScope, ticketId: number) {
    const db = await requireDb();
    const ticket = (await db.select().from(tickets).where(and(eq(tickets.id, ticketId), eq(tickets.organizationId, scope.organizationId))).limit(1))[0];
    if (!ticket) throw new Error("Ticket ვერ მოიძებნა.");
    await db.update(tickets).set({ status: "resolved" }).where(and(eq(tickets.id, ticketId), eq(tickets.organizationId, scope.organizationId)));
    await this.addAudit(scope, "ticket.resolved", "ticket", String(ticketId), {});
  },

  async listLeads(scope: WorkspaceScope) {
    const db = await requireDb();
    return db.select().from(leads).where(eq(leads.organizationId, scope.organizationId)).orderBy(desc(leads.updatedAt));
  },

  async updateLeadStage(scope: WorkspaceScope, leadId: number, stage: "new" | "qualified" | "negotiating" | "draft_order" | "closed_lost") {
    const db = await requireDb();
    await db.update(leads).set({ stage }).where(and(eq(leads.id, leadId), eq(leads.organizationId, scope.organizationId)));
    await this.addAudit(scope, "lead.stage_updated", "lead", String(leadId), { stage });
  },

  async listDraftOrders(scope: WorkspaceScope) {
    const db = await requireDb();
    return db.select().from(draftOrders).where(eq(draftOrders.organizationId, scope.organizationId)).orderBy(desc(draftOrders.updatedAt));
  },

  async listOrderItems(scope: WorkspaceScope, draftOrderId: number) {
    const db = await requireDb();
    return db.select().from(orderItems).where(and(eq(orderItems.organizationId, scope.organizationId), eq(orderItems.draftOrderId, draftOrderId)));
  },

  async listNotifications(scope: WorkspaceScope) {
    const db = await requireDb();
    return db.select().from(notifications).where(eq(notifications.organizationId, scope.organizationId)).orderBy(desc(notifications.createdAt));
  },

  async markNotificationsRead(scope: WorkspaceScope, ids?: number[]) {
    const db = await requireDb();
    if (!ids?.length) await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.organizationId, scope.organizationId), sql`${notifications.readAt} is null`));
    else for (const id of ids) await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.organizationId, scope.organizationId)));
  },

  async createNotificationOnce(scope: WorkspaceScope, input: { type: "human_takeover" | "high_priority_lead" | "needs_human" | "ai_paused"; title: string; body: string; relatedConversationId?: number; dedupeKey: string }) {
    const db = await requireDb();
    const found = (await db.select().from(notifications).where(and(eq(notifications.organizationId, scope.organizationId), eq(notifications.dedupeKey, input.dedupeKey))).limit(1))[0];
    if (found) return found;
    await db.insert(notifications).values({ organizationId: scope.organizationId, ...input });
    return (await db.select().from(notifications).where(and(eq(notifications.organizationId, scope.organizationId), eq(notifications.dedupeKey, input.dedupeKey))).limit(1))[0];
  },

  async scheduleConversationProcessing(scope: WorkspaceScope, conversationId: number, latestInboundEventId: string, scheduledAt: Date) {
    const db = await requireDb();
    const active = (await db.select().from(backgroundJobs).where(and(eq(backgroundJobs.organizationId, scope.organizationId), eq(backgroundJobs.conversationId, conversationId), eq(backgroundJobs.type, "process_conversation"), eq(backgroundJobs.status, "pending"))).limit(1))[0];
    if (active) {
      await db.update(backgroundJobs).set({ scheduledAt, payload: { latestInboundEventId } }).where(eq(backgroundJobs.id, active.id));
      return active.id;
    }
    const dedupeKey = `process:${conversationId}:${latestInboundEventId}`;
    await db.insert(backgroundJobs).values({ organizationId: scope.organizationId, conversationId, type: "process_conversation", status: "pending", dedupeKey, scheduledAt, payload: { latestInboundEventId } });
    return (await db.select().from(backgroundJobs).where(and(eq(backgroundJobs.organizationId, scope.organizationId), eq(backgroundJobs.dedupeKey, dedupeKey))).limit(1))[0]?.id;
  },

  async dueConversationJobs(limit = 20) {
    const db = await requireDb();
    return db.select().from(backgroundJobs).where(and(eq(backgroundJobs.type, "process_conversation"), eq(backgroundJobs.status, "pending"), sql`${backgroundJobs.scheduledAt} <= now()`)).orderBy(asc(backgroundJobs.scheduledAt)).limit(limit);
  },

  async markJob(scope: WorkspaceScope, jobId: number, status: "processing" | "completed" | "failed", lastError?: string) {
    const db = await requireDb();
    await db.update(backgroundJobs).set({ status, attempts: sql`${backgroundJobs.attempts} + 1`, ...(status === "completed" ? { processedAt: new Date() } : {}), ...(lastError ? { lastError } : {}) }).where(and(eq(backgroundJobs.id, jobId), eq(backgroundJobs.organizationId, scope.organizationId)));
  },

  async getConversation(scope: WorkspaceScope, conversationId: number) {
    const db = await requireDb();
    return (await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.organizationId, scope.organizationId))).limit(1))[0];
  },

  async getCustomerParticipant(scope: WorkspaceScope, conversationId: number) {
    const db = await requireDb();
    return (await db.select().from(conversationParticipants).where(and(
      eq(conversationParticipants.organizationId, scope.organizationId),
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.participantType, "customer"),
    )).limit(1))[0];
  },

  async listCatalogFacts(scope: WorkspaceScope) {
    const db = await requireDb();
    return db.select({ product: products, variant: productVariants }).from(products).innerJoin(productVariants, and(eq(productVariants.productId, products.id), eq(productVariants.organizationId, scope.organizationId))).where(and(eq(products.organizationId, scope.organizationId), eq(products.active, true), eq(productVariants.active, true)));
  },

  async getOrganization(scope: WorkspaceScope) {
    const db = await requireDb();
    return (await db.select().from(organizations).where(eq(organizations.id, scope.organizationId)).limit(1))[0];
  },

  async updateAssistantSettings(scope: WorkspaceScope, input: { aiPersona?: string; aiTone?: string; replyLength?: "short" | "normal" | "detailed"; fallbackMessage?: string }) {
    const db = await requireDb();
    const patch: Record<string, unknown> = {};
    if (input.aiPersona !== undefined) patch.aiPersona = input.aiPersona;
    if (input.aiTone !== undefined) patch.aiTone = input.aiTone;
    if (input.replyLength !== undefined) patch.replyLength = input.replyLength;
    if (input.fallbackMessage !== undefined) patch.fallbackMessage = input.fallbackMessage;
    if (Object.keys(patch).length) await db.update(organizations).set(patch).where(eq(organizations.id, scope.organizationId));
    await ensureOnboarding(scope);
    await db.update(organizationOnboarding).set({ assistantReviewedAt: new Date() }).where(eq(organizationOnboarding.organizationId, scope.organizationId));
    await this.addAudit(scope, "assistant.settings_updated", "organization", String(scope.organizationId), { changed: Object.keys(patch) });
    return this.getOrganization(scope);
  },

  async addAudit(scope: WorkspaceScope, action: string, targetType: string, targetId: string, payload: unknown) {
    const db = await requireDb();
    await db.insert(auditEvents).values({ organizationId: scope.organizationId, actorUserId: scope.actorUserId, action, targetType, targetId, payload: payload as Record<string, unknown> });
  },

  async ensureUsageCounter(scope: WorkspaceScope, periodKey: string) {
    const db = await requireDb();
    const found = (await db.select().from(usageCounters).where(and(eq(usageCounters.organizationId, scope.organizationId), eq(usageCounters.periodKey, periodKey))).limit(1))[0];
    if (found) return found;
    await db.insert(usageCounters).values({ organizationId: scope.organizationId, periodKey });
    return (await db.select().from(usageCounters).where(and(eq(usageCounters.organizationId, scope.organizationId), eq(usageCounters.periodKey, periodKey))).limit(1))[0];
  },

  async ensureIntegrationStates(scope: WorkspaceScope) {
    const db = await requireDb();
    for (const provider of ["meta", "openai", "telegram"] as const) {
      const existing = (await db.select().from(integrationSettings).where(and(eq(integrationSettings.organizationId, scope.organizationId), eq(integrationSettings.provider, provider))).limit(1))[0];
      if (!existing) await db.insert(integrationSettings).values({ organizationId: scope.organizationId, provider, status: "unconfigured" });
    }
  },

  async listIntegrationStates(scope: WorkspaceScope) {
    const db = await requireDb();
    return db.select().from(integrationSettings).where(eq(integrationSettings.organizationId, scope.organizationId));
  },

  async getMetaConnection(scope: WorkspaceScope) {
    const db = await requireDb();
    return (await db.select().from(metaConnections).where(eq(metaConnections.organizationId, scope.organizationId)).limit(1))[0];
  },

  async getMetaConnectionByPageId(pageId: string) {
    const db = await requireDb();
    return (await db.select().from(metaConnections).where(eq(metaConnections.pageId, pageId)).limit(1))[0];
  },

  async upsertMetaConnection(scope: WorkspaceScope, input: { pageId: string; pageName: string; status: "connected" | "delivery_failed" | "verification_failed" | "disabled" | "unconfigured"; lastError?: string | null; webhookVerifiedAt?: Date | null }) {
    const db = await requireDb();
    const existing = await this.getMetaConnection(scope);
    const connection = {
      pageId: input.pageId,
      pageName: input.pageName,
      status: input.status,
      lastError: input.lastError ?? null,
      webhookVerifiedAt: input.webhookVerifiedAt ?? null,
    };
    if (existing) {
      await db.update(metaConnections).set(connection).where(eq(metaConnections.id, existing.id));
    } else {
      await db.insert(metaConnections).values({ organizationId: scope.organizationId, ...connection });
    }
    await this.addAudit(scope, "meta.connection_updated", "meta_connection", input.pageId, { status: input.status, pageName: input.pageName });
    return this.getMetaConnection(scope);
  },

  async updateMetaConnectionStatus(scope: WorkspaceScope, input: { status: "unconfigured" | "verification_failed" | "connected" | "delivery_failed" | "disabled"; error?: string | null; inbound?: boolean; delivery?: boolean; verified?: boolean }) {
    const db = await requireDb();
    const current = await this.getMetaConnection(scope);
    if (!current) return undefined;
    await db.update(metaConnections).set({
      status: input.status,
      lastError: input.error ?? null,
      ...(input.inbound ? { lastInboundAt: new Date() } : {}),
      ...(input.delivery ? { lastDeliveryAt: new Date() } : {}),
      ...(input.verified ? { webhookVerifiedAt: new Date() } : {}),
    }).where(eq(metaConnections.id, current.id));
    return this.getMetaConnection(scope);
  },

  async createMetaOauthSession(scope: WorkspaceScope, input: { id: string; stateHash: string; expiresAt: Date }) {
    const db = await requireDb();
    await db.insert(metaOauthSessions).values({ id: input.id, stateHash: input.stateHash, organizationId: scope.organizationId, userId: scope.actorUserId!, expiresAt: input.expiresAt });
  },

  async getMetaOauthSessionByStateHash(stateHash: string) {
    const db = await requireDb();
    return (await db.select().from(metaOauthSessions).where(eq(metaOauthSessions.stateHash, stateHash)).limit(1))[0];
  },

  async getMetaOauthSession(scope: WorkspaceScope, sessionId: string) {
    const db = await requireDb();
    return (await db.select().from(metaOauthSessions).where(and(eq(metaOauthSessions.id, sessionId), eq(metaOauthSessions.organizationId, scope.organizationId), eq(metaOauthSessions.userId, scope.actorUserId!))).limit(1))[0];
  },

  async setMetaOauthPages(sessionId: string, pageCandidates: unknown) {
    const db = await requireDb();
    await db.update(metaOauthSessions).set({ status: "pages_ready", pageCandidates: pageCandidates as Record<string, unknown>, error: null }).where(eq(metaOauthSessions.id, sessionId));
  },

  async failMetaOauthSession(sessionId: string, error: string) {
    const db = await requireDb();
    await db.update(metaOauthSessions).set({ status: "failed", error }).where(eq(metaOauthSessions.id, sessionId));
  },

  async completeMetaOauthSession(scope: WorkspaceScope, sessionId: string) {
    const db = await requireDb();
    await db.update(metaOauthSessions).set({ status: "completed", pageCandidates: null, completedAt: new Date(), error: null }).where(and(eq(metaOauthSessions.id, sessionId), eq(metaOauthSessions.organizationId, scope.organizationId), eq(metaOauthSessions.userId, scope.actorUserId!)));
  },

  async createMetaWebhookEventOnce(input: { organizationId: number; pageId: string; eventKey: string; eventType: string; payload: Record<string, unknown> }) {
    const db = await requireDb();
    const existing = (await db.select().from(metaWebhookEvents).where(and(eq(metaWebhookEvents.organizationId, input.organizationId), eq(metaWebhookEvents.eventKey, input.eventKey))).limit(1))[0];
    if (existing) return { event: existing, created: false };
    try {
      await db.insert(metaWebhookEvents).values({ ...input, status: "received" });
    } catch (error) {
      const duplicate = (await db.select().from(metaWebhookEvents).where(and(eq(metaWebhookEvents.organizationId, input.organizationId), eq(metaWebhookEvents.eventKey, input.eventKey))).limit(1))[0];
      if (duplicate) return { event: duplicate, created: false };
      throw error;
    }
    const event = (await db.select().from(metaWebhookEvents).where(and(eq(metaWebhookEvents.organizationId, input.organizationId), eq(metaWebhookEvents.eventKey, input.eventKey))).limit(1))[0];
    if (!event) throw new Error("Meta webhook event could not be persisted");
    return { event, created: true };
  },

  async setMetaWebhookEventStatus(eventId: number, status: "ignored" | "processed" | "failed", error?: string) {
    const db = await requireDb();
    await db.update(metaWebhookEvents).set({ status, ...(status === "processed" || status === "ignored" ? { processedAt: new Date() } : {}), ...(error ? { error } : {}) }).where(eq(metaWebhookEvents.id, eventId));
  },

  async getOrCreateMetaConversation(scope: WorkspaceScope, input: { pageId: string; psid: string; displayName?: string | null }) {
    const db = await requireDb();
    const externalId = `meta:${input.pageId}:${input.psid}`;
    const existing = await db.select({ conversation: conversations })
      .from(conversationParticipants)
      .innerJoin(conversations, and(eq(conversationParticipants.conversationId, conversations.id), eq(conversations.organizationId, scope.organizationId)))
      .where(and(eq(conversationParticipants.organizationId, scope.organizationId), eq(conversationParticipants.participantType, "customer"), eq(conversationParticipants.externalId, externalId)))
      .limit(1);
    if (existing[0]?.conversation) return existing[0].conversation;

    const created = await db.insert(conversations).values({ organizationId: scope.organizationId, customerName: input.displayName?.trim() || "Messenger მომხმარებელი", preview: "ახალი Meta Messenger საუბარი" });
    const insertId = Number((created as unknown as [{ insertId?: number }])[0]?.insertId);
    if (!Number.isInteger(insertId) || insertId <= 0) throw new Error("Meta conversation could not be created");
    await db.insert(conversationParticipants).values({ organizationId: scope.organizationId, conversationId: insertId, participantType: "customer", displayName: input.displayName?.trim() || "Messenger მომხმარებელი", externalId });
    const conversation = (await db.select().from(conversations).where(and(eq(conversations.id, insertId), eq(conversations.organizationId, scope.organizationId))).limit(1))[0];
    if (!conversation) throw new Error("Meta conversation could not be loaded");
    return conversation;
  },

  async ensurePlan() {
    const db = await requireDb();
    const existing = (await db.select().from(plans).where(eq(plans.code, "growth-demo")).limit(1))[0];
    if (existing) return existing;
    await db.insert(plans).values({ code: "growth-demo", name: "Growth Demo", monthlyReplyQuota: 5000 });
    return (await db.select().from(plans).where(eq(plans.code, "growth-demo")).limit(1))[0]!;
  },
};

export { DEMO_SLUG };
