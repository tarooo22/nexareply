ALTER TABLE `notifications` MODIFY COLUMN `type` enum('human_takeover','high_priority_lead','needs_human','ai_paused','delivery_failed') NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `automated` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `autoReplyEnabled` boolean DEFAULT false NOT NULL;