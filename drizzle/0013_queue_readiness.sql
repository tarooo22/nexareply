CREATE TABLE `rate_limit_buckets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`bucketKey` varchar(120) NOT NULL,
	`windowStartsAt` timestamp NOT NULL,
	`hitCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_limit_buckets_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_limit_org_bucket_window_unique` UNIQUE(`organizationId`,`bucketKey`,`windowStartsAt`)
);
--> statement-breakpoint
ALTER TABLE `background_jobs` ADD `leaseToken` varchar(64);--> statement-breakpoint
ALTER TABLE `background_jobs` ADD `leaseExpiresAt` timestamp;--> statement-breakpoint
CREATE INDEX `rate_limit_bucket_expiry_idx` ON `rate_limit_buckets` (`windowStartsAt`);--> statement-breakpoint
CREATE INDEX `jobs_org_status_due_idx` ON `background_jobs` (`organizationId`,`status`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `jobs_lease_expiry_idx` ON `background_jobs` (`status`,`leaseExpiresAt`);--> statement-breakpoint
CREATE INDEX `conversations_org_updated_id_idx` ON `conversations` (`organizationId`,`updatedAt`,`id`);