ALTER TABLE `users` ADD `normalizedEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_normalized_email_unique` UNIQUE(`normalizedEmail`);