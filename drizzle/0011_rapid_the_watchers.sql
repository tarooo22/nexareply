CREATE TABLE `meta_oauth_page_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`organizationId` int NOT NULL,
	`pageId` varchar(80) NOT NULL,
	`encryptedPageToken` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meta_oauth_page_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `meta_oauth_page_token_session_page_unique` UNIQUE(`sessionId`,`pageId`)
);
--> statement-breakpoint
CREATE TABLE `meta_token_vaults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`pageId` varchar(80) NOT NULL,
	`encryptedPageToken` text NOT NULL,
	`keyVersion` int NOT NULL DEFAULT 1,
	`tokenExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meta_token_vaults_id` PRIMARY KEY(`id`),
	CONSTRAINT `meta_token_vault_org_unique` UNIQUE(`organizationId`),
	CONSTRAINT `meta_token_vault_page_unique` UNIQUE(`pageId`)
);
--> statement-breakpoint
CREATE TABLE `organization_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('trialing','active','past_due','cancelled','expired') NOT NULL DEFAULT 'trialing',
	`trialEndsAt` timestamp,
	`currentPeriodStartsAt` timestamp NOT NULL,
	`currentPeriodEndsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_subscriptions_org_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `plan_entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`key` varchar(80) NOT NULL,
	`valueType` enum('boolean','limit') NOT NULL,
	`booleanValue` boolean,
	`limitValue` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plan_entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_entitlements_plan_key_unique` UNIQUE(`planId`,`key`)
);
--> statement-breakpoint
ALTER TABLE `meta_connections` ADD `credentialMode` enum('none','pilot_managed','tenant_vault') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `trialDays` int DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `memberLimit` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `channelLimit` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `aiAutomationEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `active` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `meta_oauth_page_token_expiry_idx` ON `meta_oauth_page_tokens` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `organization_subscriptions_status_end_idx` ON `organization_subscriptions` (`status`,`currentPeriodEndsAt`);