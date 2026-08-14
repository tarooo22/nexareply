ALTER TABLE `meta_oauth_sessions` RENAME COLUMN `encryptedPageCandidates` TO `pageCandidates`;--> statement-breakpoint
ALTER TABLE `meta_oauth_sessions` MODIFY COLUMN `pageCandidates` json;--> statement-breakpoint
ALTER TABLE `meta_connections` DROP COLUMN `encryptedPageAccessToken`;--> statement-breakpoint
ALTER TABLE `meta_connections` DROP COLUMN `tokenExpiresAt`;