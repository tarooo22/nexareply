CREATE TABLE `meta_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`pageId` varchar(80),
	`pageName` varchar(255),
	`encryptedPageAccessToken` text,
	`tokenExpiresAt` timestamp,
	`status` enum('unconfigured','verification_failed','connected','delivery_failed','disabled') NOT NULL DEFAULT 'unconfigured',
	`lastError` text,
	`webhookVerifiedAt` timestamp,
	`lastInboundAt` timestamp,
	`lastDeliveryAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meta_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `meta_connections_org_unique` UNIQUE(`organizationId`),
	CONSTRAINT `meta_connections_page_unique` UNIQUE(`pageId`)
);
--> statement-breakpoint
CREATE TABLE `meta_oauth_sessions` (
	`id` varchar(64) NOT NULL,
	`stateHash` varchar(64) NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','pages_ready','completed','failed','expired') NOT NULL DEFAULT 'pending',
	`encryptedPageCandidates` text,
	`error` text,
	`expiresAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meta_oauth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `meta_oauth_state_unique` UNIQUE(`stateHash`)
);
--> statement-breakpoint
CREATE TABLE `meta_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`pageId` varchar(80) NOT NULL,
	`eventKey` varchar(255) NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`payload` json,
	`status` enum('received','ignored','processed','failed') NOT NULL DEFAULT 'received',
	`error` text,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `meta_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `meta_events_org_key_unique` UNIQUE(`organizationId`,`eventKey`)
);
--> statement-breakpoint
CREATE INDEX `meta_oauth_owner_expiry_idx` ON `meta_oauth_sessions` (`organizationId`,`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `meta_events_org_page_received_idx` ON `meta_webhook_events` (`organizationId`,`pageId`,`receivedAt`);