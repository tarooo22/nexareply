import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  normalizedEmail: varchar("normalizedEmail", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => [uniqueIndex("users_normalized_email_unique").on(table.normalizedEmail)]);

export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  monthlyReplyQuota: int("monthlyReplyQuota").notNull().default(5000),
  trialDays: int("trialDays").notNull().default(14),
  memberLimit: int("memberLimit").notNull().default(3),
  channelLimit: int("channelLimit").notNull().default(1),
  aiAutomationEnabled: boolean("aiAutomationEnabled").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("plans_code_unique").on(table.code)]);

/** Dynamic plan-level limits and feature flags; values constrain one tenant, never platform tenant count. */
export const planEntitlements = mysqlTable("plan_entitlements", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  key: varchar("key", { length: 80 }).notNull(),
  valueType: mysqlEnum("valueType", ["boolean", "limit"]).notNull(),
  booleanValue: boolean("booleanValue"),
  limitValue: int("limitValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("plan_entitlements_plan_key_unique").on(table.planId, table.key)]);

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  mode: mysqlEnum("mode", ["demo", "live"]).notNull().default("live"),
  planId: int("planId"),
  aiTone: varchar("aiTone", { length: 100 }).notNull().default("თბილი და კონკრეტული"),
  aiPersona: varchar("aiPersona", { length: 180 }).notNull().default("Amadeo-ის სუნამოების კონსულტანტი"),
  replyLength: mysqlEnum("replyLength", ["short", "normal", "detailed"]).notNull().default("normal"),
  fallbackMessage: text("fallbackMessage"),
  debounceSeconds: int("debounceSeconds").notNull().default(10),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("organizations_slug_unique").on(table.slug), index("organizations_plan_idx").on(table.planId)]);

/** One current entitlement lifecycle per organization; billing providers can be added without weakening server-side guards. */
export const organizationSubscriptions = mysqlTable("organization_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  planId: int("planId").notNull(),
  status: mysqlEnum("status", ["trialing", "active", "past_due", "cancelled", "expired"]).notNull().default("trialing"),
  trialEndsAt: timestamp("trialEndsAt"),
  currentPeriodStartsAt: timestamp("currentPeriodStartsAt").notNull(),
  currentPeriodEndsAt: timestamp("currentPeriodEndsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("organization_subscriptions_org_unique").on(table.organizationId),
  index("organization_subscriptions_status_end_idx").on(table.status, table.currentPeriodEndsAt),
]);

/**
 * Owner-controlled onboarding presentation state. Completion is derived from
 * tenant-scoped operational records; only review/dismiss interaction timestamps
 * are persisted here so a checklist can be restarted without altering live data.
 */
export const organizationOnboarding = mysqlTable("organization_onboarding", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  assistantReviewedAt: timestamp("assistantReviewedAt"),
  dismissedAt: timestamp("dismissedAt"),
  dismissedByUserId: int("dismissedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("organization_onboarding_org_unique").on(table.organizationId)]);

export const organizationMemberships = mysqlTable("organization_memberships", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "operator"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("membership_org_user_unique").on(table.organizationId, table.userId),
  index("membership_user_idx").on(table.userId),
]);

/**
 * Invitation tokens are SHA-256 hashes only. The bearer token exists only in the
 * one-time owner response/email link and never in persistence or public responses.
 */
export const organizationInvitations = mysqlTable("organization_invitations", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  normalizedEmail: varchar("normalizedEmail", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["operator"]).notNull().default("operator"),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
  activeEmailKey: varchar("activeEmailKey", { length: 360 }),
  status: mysqlEnum("status", ["pending", "accepted", "expired", "cancelled"]).notNull().default("pending"),
  deliveryStatus: mysqlEnum("deliveryStatus", ["manual_ready", "sent", "delivery_failed"]).notNull().default("manual_ready"),
  invitedByUserId: int("invitedByUserId").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 160 }),
  lastError: text("lastError"),
  expiresAt: timestamp("expiresAt").notNull(),
  sentAt: timestamp("sentAt"),
  acceptedAt: timestamp("acceptedAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("organization_invitation_token_unique").on(table.tokenHash),
  uniqueIndex("organization_invitation_active_email_unique").on(table.activeEmailKey),
  index("organization_invitation_org_status_idx").on(table.organizationId, table.status, table.expiresAt),
]);

export const usageCounters = mysqlTable("usage_counters", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  periodKey: varchar("periodKey", { length: 16 }).notNull(),
  aiReplyCount: int("aiReplyCount").notNull().default(0),
  messageCount: int("messageCount").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("usage_org_period_unique").on(table.organizationId, table.periodKey)]);

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  brand: varchar("brand", { length: 100 }).notNull(),
  model: varchar("model", { length: 160 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("ელექტრონიკა"),
  sku: varchar("sku", { length: 120 }).notNull(),
  description: text("description").notNull(),
  active: boolean("active").notNull().default(true),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("products_org_sku_unique").on(table.organizationId, table.sku),
  index("products_org_active_idx").on(table.organizationId, table.active),
]);

export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  productId: int("productId").notNull(),
  sku: varchar("sku", { length: 120 }).notNull(),
  storage: varchar("storage", { length: 80 }).notNull().default("—"),
  color: varchar("color", { length: 100 }).notNull().default("—"),
  priceGel: decimal("priceGel", { precision: 12, scale: 2 }).notNull(),
  stock: int("stock").notNull().default(0),
  installment: varchar("installment", { length: 120 }).notNull().default("არ არის მითითებული"),
  warranty: varchar("warranty", { length: 120 }).notNull().default("არ არის მითითებული"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("variants_org_sku_unique").on(table.organizationId, table.sku),
  index("variants_org_product_idx").on(table.organizationId, table.productId),
]);

/** Object-storage references only; product bytes are never stored in MySQL. */
export const productAssets = mysqlTable("product_assets", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  productId: int("productId").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  byteSize: int("byteSize").notNull(),
  width: int("width").notNull(),
  height: int("height").notNull(),
  altText: varchar("altText", { length: 280 }),
  sortOrder: int("sortOrder").notNull().default(0),
  isPrimary: boolean("isPrimary").notNull().default(false),
  createdByUserId: int("createdByUserId"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("product_assets_org_product_active_idx").on(table.organizationId, table.productId, table.deletedAt),
  index("product_assets_org_primary_idx").on(table.organizationId, table.productId, table.isPrimary),
]);

export const productImports = mysqlTable("product_imports", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  createdByUserId: int("createdByUserId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  format: mysqlEnum("format", ["csv", "xlsx"]).notNull(),
  status: mysqlEnum("status", ["preview", "completed", "failed"]).notNull().default("preview"),
  validRows: int("validRows").notNull().default(0),
  invalidRows: int("invalidRows").notNull().default(0),
  errors: json("errors"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const knowledgeFacts = mysqlTable("knowledge_facts", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 80 }).notNull().default("general"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("knowledge_org_active_idx").on(table.organizationId, table.active)]);

/** Owner-submitted business context. Facts extracted from it remain drafts until approved. */
export const knowledgeSources = mysqlTable("knowledge_sources", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  sourceType: mysqlEnum("sourceType", ["composer"]).notNull().default("composer"),
  title: varchar("title", { length: 180 }).notNull(),
  originalText: text("originalText").notNull(),
  status: mysqlEnum("status", ["draft", "partially_approved", "approved", "archived"]).notNull().default("draft"),
  version: int("version").notNull().default(1),
  createdByUserId: int("createdByUserId"),
  approvedByUserId: int("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("knowledge_sources_org_status_idx").on(table.organizationId, table.status, table.createdAt)]);

/** Extracted normalized statements. Pending/rejected rows are never used by the assistant. */
export const knowledgeDraftFacts = mysqlTable("knowledge_draft_facts", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  sourceId: int("sourceId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 80 }).notNull().default("general"),
  confidence: int("confidence").notNull().default(0),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  approvedKnowledgeFactId: int("approvedKnowledgeFactId"),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("knowledge_drafts_org_source_status_idx").on(table.organizationId, table.sourceId, table.status)]);

export const knowledgeDocuments = mysqlTable("knowledge_documents", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }),
  mimeType: varchar("mimeType", { length: 120 }),
  status: mysqlEnum("status", ["pending", "indexed", "failed"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  source: varchar("source", { length: 80 }).notNull().default("messenger"),
  stage: mysqlEnum("stage", ["new", "qualified", "negotiating", "draft_order", "closed_lost"]).notNull().default("new"),
  priority: mysqlEnum("priority", ["normal", "high"]).notNull().default("normal"),
  preferredProduct: varchar("preferredProduct", { length: 180 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("leads_org_stage_idx").on(table.organizationId, table.stage)]);

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  leadId: int("leadId"),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 50 }),
  status: mysqlEnum("status", ["open", "pending", "closed"]).notNull().default("open"),
  humanActive: boolean("humanActive").notNull().default(false),
  aiState: mysqlEnum("aiState", ["active", "paused", "needs_human"]).notNull().default("active"),
  priority: mysqlEnum("priority", ["normal", "high"]).notNull().default("normal"),
  preview: text("preview"),
  preferredProduct: varchar("preferredProduct", { length: 180 }),
  lastInboundAt: timestamp("lastInboundAt"),
  lastMessageAt: timestamp("lastMessageAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("conversations_org_status_idx").on(table.organizationId, table.status), index("conversations_org_updated_idx").on(table.organizationId, table.updatedAt), index("conversations_org_updated_id_idx").on(table.organizationId, table.updatedAt, table.id)]);

export const conversationParticipants = mysqlTable("conversation_participants", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  conversationId: int("conversationId").notNull(),
  participantType: mysqlEnum("participantType", ["customer", "user"]).notNull(),
  userId: int("userId"),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  externalId: varchar("externalId", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("participants_org_conversation_idx").on(table.organizationId, table.conversationId)]);

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  conversationId: int("conversationId").notNull(),
  sender: mysqlEnum("sender", ["customer", "ai", "operator", "system"]).notNull(),
  body: text("body").notNull(),
  source: mysqlEnum("source", ["demo", "manual", "ai", "meta", "system"]).notNull().default("demo"),
  inboundEventId: varchar("inboundEventId", { length: 160 }),
  isDraft: boolean("isDraft").notNull().default(false),
  draftEvidence: json("draftEvidence"),
  deliveryStatus: mysqlEnum("deliveryStatus", ["received", "draft", "queued", "sent", "failed"]).notNull().default("received"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("messages_org_inbound_event_unique").on(table.organizationId, table.inboundEventId),
  index("messages_org_conversation_created_idx").on(table.organizationId, table.conversationId, table.createdAt),
]);

export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  conversationId: int("conversationId").notNull(),
  reason: varchar("reason", { length: 200 }).notNull(),
  status: mysqlEnum("status", ["open", "resolved", "closed"]).notNull().default("open"),
  priority: mysqlEnum("priority", ["normal", "high"]).notNull().default("normal"),
  idempotencyKey: varchar("idempotencyKey", { length: 200 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("tickets_org_idempotency_unique").on(table.organizationId, table.idempotencyKey), index("tickets_org_status_idx").on(table.organizationId, table.status)]);

export const ticketReplies = mysqlTable("ticket_replies", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  ticketId: int("ticketId").notNull(),
  authorUserId: int("authorUserId"),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const draftOrders = mysqlTable("draft_orders", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  leadId: int("leadId"),
  conversationId: int("conversationId"),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  status: mysqlEnum("status", ["needs_confirmation", "verified", "cancelled"]).notNull().default("needs_confirmation"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("draft_orders_org_status_idx").on(table.organizationId, table.status)]);

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  draftOrderId: int("draftOrderId").notNull(),
  productVariantId: int("productVariantId"),
  productName: varchar("productName", { length: 200 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  unitPriceGel: decimal("unitPriceGel", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId"),
  type: mysqlEnum("type", ["human_takeover", "high_priority_lead", "needs_human", "ai_paused"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  relatedConversationId: int("relatedConversationId"),
  dedupeKey: varchar("dedupeKey", { length: 200 }).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("notifications_org_dedupe_unique").on(table.organizationId, table.dedupeKey), index("notifications_org_read_idx").on(table.organizationId, table.readAt)]);

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  actorUserId: int("actorUserId"),
  action: varchar("action", { length: 160 }).notNull(),
  targetType: varchar("targetType", { length: 100 }).notNull(),
  targetId: varchar("targetId", { length: 100 }),
  payload: json("payload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audit_org_created_idx").on(table.organizationId, table.createdAt)]);

export const backgroundJobs = mysqlTable("background_jobs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  conversationId: int("conversationId"),
  type: mysqlEnum("type", ["process_conversation", "cleanup"]).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "cancelled"]).notNull().default("pending"),
  dedupeKey: varchar("dedupeKey", { length: 200 }).notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  attempts: int("attempts").notNull().default(0),
  leaseToken: varchar("leaseToken", { length: 64 }),
  leaseExpiresAt: timestamp("leaseExpiresAt"),
  payload: json("payload"),
  lastError: text("lastError"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("jobs_org_dedupe_unique").on(table.organizationId, table.dedupeKey), index("jobs_due_idx").on(table.status, table.scheduledAt), index("jobs_org_status_due_idx").on(table.organizationId, table.status, table.scheduledAt), index("jobs_lease_expiry_idx").on(table.status, table.leaseExpiresAt)]);

export const rateLimitBuckets = mysqlTable("rate_limit_buckets", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  bucketKey: varchar("bucketKey", { length: 120 }).notNull(),
  windowStartsAt: timestamp("windowStartsAt").notNull(),
  hitCount: int("hitCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("rate_limit_org_bucket_window_unique").on(table.organizationId, table.bucketKey, table.windowStartsAt), index("rate_limit_bucket_expiry_idx").on(table.windowStartsAt)]);

export const integrationSettings = mysqlTable("integration_settings", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  provider: mysqlEnum("provider", ["meta", "openai", "telegram"]).notNull(),
  status: mysqlEnum("status", ["unconfigured", "configured", "disabled"]).notNull().default("unconfigured"),
  settings: json("settings"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("integrations_org_provider_unique").on(table.organizationId, table.provider)]);

/** Meta Page connection metadata. Provider credentials are only managed server secrets. */
export const metaConnections = mysqlTable("meta_connections", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  pageId: varchar("pageId", { length: 80 }),
  pageName: varchar("pageName", { length: 255 }),
  credentialMode: mysqlEnum("credentialMode", ["none", "pilot_managed", "tenant_vault"]).notNull().default("none"),
  status: mysqlEnum("status", ["unconfigured", "verification_failed", "connected", "delivery_failed", "disabled"]).notNull().default("unconfigured"),
  lastError: text("lastError"),
  webhookVerifiedAt: timestamp("webhookVerifiedAt"),
  lastInboundAt: timestamp("lastInboundAt"),
  lastDeliveryAt: timestamp("lastDeliveryAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("meta_connections_org_unique").on(table.organizationId), uniqueIndex("meta_connections_page_unique").on(table.pageId)]);

/** AES-GCM ciphertext only. Plain provider tokens must never be persisted or returned from a DTO. */
export const metaTokenVaults = mysqlTable("meta_token_vaults", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  pageId: varchar("pageId", { length: 80 }).notNull(),
  encryptedPageToken: text("encryptedPageToken").notNull(),
  keyVersion: int("keyVersion").notNull().default(1),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("meta_token_vault_org_unique").on(table.organizationId), uniqueIndex("meta_token_vault_page_unique").on(table.pageId)]);

/** Short-lived OAuth handoff. It stores only selected-account Page IDs/names, never provider tokens. */
export const metaOauthSessions = mysqlTable("meta_oauth_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  stateHash: varchar("stateHash", { length: 64 }).notNull(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "pages_ready", "completed", "failed", "expired"]).notNull().default("pending"),
  pageCandidates: json("pageCandidates"),
  error: text("error"),
  expiresAt: timestamp("expiresAt").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("meta_oauth_state_unique").on(table.stateHash), index("meta_oauth_owner_expiry_idx").on(table.organizationId, table.userId, table.expiresAt)]);

/** Short-lived encrypted Page tokens staged between OAuth callback and an owner Page selection. */
export const metaOauthPageTokens = mysqlTable("meta_oauth_page_tokens", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  organizationId: int("organizationId").notNull(),
  pageId: varchar("pageId", { length: 80 }).notNull(),
  encryptedPageToken: text("encryptedPageToken").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("meta_oauth_page_token_session_page_unique").on(table.sessionId, table.pageId), index("meta_oauth_page_token_expiry_idx").on(table.expiresAt)]);

/** Incoming Meta webhook events provide provider-level idempotency before conversation mutation. */
export const metaWebhookEvents = mysqlTable("meta_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  pageId: varchar("pageId", { length: 80 }).notNull(),
  eventKey: varchar("eventKey", { length: 255 }).notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  payload: json("payload"),
  status: mysqlEnum("status", ["received", "ignored", "processed", "failed"]).notNull().default("received"),
  error: text("error"),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
}, (table) => [uniqueIndex("meta_events_org_key_unique").on(table.organizationId, table.eventKey), index("meta_events_org_page_received_idx").on(table.organizationId, table.pageId, table.receivedAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MetaConnection = typeof metaConnections.$inferSelect;
