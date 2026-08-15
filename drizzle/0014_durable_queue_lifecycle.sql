ALTER TABLE `background_jobs` MODIFY COLUMN `status` enum('pending','processing','retrying','completed','failed','dead_letter','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `background_jobs` ADD `maxAttempts` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `background_jobs` ADD `lastAttemptAt` timestamp;--> statement-breakpoint
ALTER TABLE `background_jobs` ADD `deadLetteredAt` timestamp;