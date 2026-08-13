CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`actorUserId` int,
	`action` varchar(160) NOT NULL,
	`targetType` varchar(100) NOT NULL,
	`targetId` varchar(100),
	`payload` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `background_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`conversationId` int,
	`type` enum('process_conversation','cleanup') NOT NULL,
	`status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`dedupeKey` varchar(200) NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`payload` json,
	`lastError` text,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `background_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobs_org_dedupe_unique` UNIQUE(`organizationId`,`dedupeKey`)
);
--> statement-breakpoint
CREATE TABLE `conversation_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`conversationId` int NOT NULL,
	`participantType` enum('customer','user') NOT NULL,
	`userId` int,
	`displayName` varchar(160) NOT NULL,
	`externalId` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversation_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`leadId` int,
	`customerName` varchar(160) NOT NULL,
	`customerPhone` varchar(50),
	`status` enum('open','pending','closed') NOT NULL DEFAULT 'open',
	`humanActive` boolean NOT NULL DEFAULT false,
	`aiState` enum('active','paused','needs_human') NOT NULL DEFAULT 'active',
	`priority` enum('normal','high') NOT NULL DEFAULT 'normal',
	`preview` text,
	`preferredProduct` varchar(180),
	`lastInboundAt` timestamp,
	`lastMessageAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `draft_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`leadId` int,
	`conversationId` int,
	`customerName` varchar(160) NOT NULL,
	`status` enum('needs_confirmation','verified','cancelled') NOT NULL DEFAULT 'needs_confirmation',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `draft_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`provider` enum('meta','openai','telegram') NOT NULL,
	`status` enum('unconfigured','configured','disabled') NOT NULL DEFAULT 'unconfigured',
	`settings` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integration_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `integrations_org_provider_unique` UNIQUE(`organizationId`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`storageKey` varchar(512),
	`mimeType` varchar(120),
	`status` enum('pending','indexed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_facts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT 'general',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_facts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(50),
	`source` varchar(80) NOT NULL DEFAULT 'messenger',
	`stage` enum('new','qualified','negotiating','draft_order','closed_lost') NOT NULL DEFAULT 'new',
	`priority` enum('normal','high') NOT NULL DEFAULT 'normal',
	`preferredProduct` varchar(180),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`conversationId` int NOT NULL,
	`sender` enum('customer','ai','operator','system') NOT NULL,
	`body` text NOT NULL,
	`source` enum('demo','manual','ai','meta','system') NOT NULL DEFAULT 'demo',
	`inboundEventId` varchar(160),
	`isDraft` boolean NOT NULL DEFAULT false,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `messages_org_inbound_event_unique` UNIQUE(`organizationId`,`inboundEventId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int,
	`type` enum('human_takeover','high_priority_lead','needs_human','ai_paused') NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`relatedConversationId` int,
	`dedupeKey` varchar(200) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_org_dedupe_unique` UNIQUE(`organizationId`,`dedupeKey`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`draftOrderId` int NOT NULL,
	`productVariantId` int,
	`productName` varchar(200) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPriceGel` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','operator') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_org_user_unique` UNIQUE(`organizationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`mode` enum('demo','live') NOT NULL DEFAULT 'live',
	`planId` int,
	`aiTone` varchar(100) NOT NULL DEFAULT 'თბილი და კონკრეტული',
	`replyLength` enum('short','normal','detailed') NOT NULL DEFAULT 'normal',
	`fallbackMessage` text,
	`debounceSeconds` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`monthlyReplyQuota` int NOT NULL DEFAULT 5000,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `product_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdByUserId` int,
	`fileName` varchar(255) NOT NULL,
	`format` enum('csv','xlsx') NOT NULL,
	`status` enum('preview','completed','failed') NOT NULL DEFAULT 'preview',
	`validRows` int NOT NULL DEFAULT 0,
	`invalidRows` int NOT NULL DEFAULT 0,
	`errors` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`productId` int NOT NULL,
	`sku` varchar(120) NOT NULL,
	`storage` varchar(80) NOT NULL DEFAULT '—',
	`color` varchar(100) NOT NULL DEFAULT '—',
	`priceGel` decimal(12,2) NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`installment` varchar(120) NOT NULL DEFAULT 'არ არის მითითებული',
	`warranty` varchar(120) NOT NULL DEFAULT 'არ არის მითითებული',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `variants_org_sku_unique` UNIQUE(`organizationId`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`brand` varchar(100) NOT NULL,
	`model` varchar(160) NOT NULL,
	`category` varchar(100) NOT NULL DEFAULT 'ელექტრონიკა',
	`sku` varchar(120) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_org_sku_unique` UNIQUE(`organizationId`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `ticket_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`ticketId` int NOT NULL,
	`authorUserId` int,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`conversationId` int NOT NULL,
	`reason` varchar(200) NOT NULL,
	`status` enum('open','resolved','closed') NOT NULL DEFAULT 'open',
	`priority` enum('normal','high') NOT NULL DEFAULT 'normal',
	`idempotencyKey` varchar(200) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_org_idempotency_unique` UNIQUE(`organizationId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `usage_counters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`periodKey` varchar(16) NOT NULL,
	`aiReplyCount` int NOT NULL DEFAULT 0,
	`messageCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usage_counters_id` PRIMARY KEY(`id`),
	CONSTRAINT `usage_org_period_unique` UNIQUE(`organizationId`,`periodKey`)
);
--> statement-breakpoint
CREATE INDEX `audit_org_created_idx` ON `audit_events` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `jobs_due_idx` ON `background_jobs` (`status`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `participants_org_conversation_idx` ON `conversation_participants` (`organizationId`,`conversationId`);--> statement-breakpoint
CREATE INDEX `conversations_org_status_idx` ON `conversations` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `conversations_org_updated_idx` ON `conversations` (`organizationId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `draft_orders_org_status_idx` ON `draft_orders` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `knowledge_org_active_idx` ON `knowledge_facts` (`organizationId`,`active`);--> statement-breakpoint
CREATE INDEX `leads_org_stage_idx` ON `leads` (`organizationId`,`stage`);--> statement-breakpoint
CREATE INDEX `messages_org_conversation_created_idx` ON `messages` (`organizationId`,`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_org_read_idx` ON `notifications` (`organizationId`,`readAt`);--> statement-breakpoint
CREATE INDEX `membership_user_idx` ON `organization_memberships` (`userId`);--> statement-breakpoint
CREATE INDEX `organizations_plan_idx` ON `organizations` (`planId`);--> statement-breakpoint
CREATE INDEX `variants_org_product_idx` ON `product_variants` (`organizationId`,`productId`);--> statement-breakpoint
CREATE INDEX `products_org_active_idx` ON `products` (`organizationId`,`active`);--> statement-breakpoint
CREATE INDEX `tickets_org_status_idx` ON `tickets` (`organizationId`,`status`);