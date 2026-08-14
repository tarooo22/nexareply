CREATE TABLE `organization_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`normalizedEmail` varchar(320) NOT NULL,
	`role` enum('operator') NOT NULL DEFAULT 'operator',
	`tokenHash` varchar(64) NOT NULL,
	`activeEmailKey` varchar(360),
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`deliveryStatus` enum('manual_ready','sent','delivery_failed') NOT NULL DEFAULT 'manual_ready',
	`invitedByUserId` int NOT NULL,
	`providerMessageId` varchar(160),
	`lastError` text,
	`expiresAt` timestamp NOT NULL,
	`sentAt` timestamp,
	`acceptedAt` timestamp,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_invitation_token_unique` UNIQUE(`tokenHash`),
	CONSTRAINT `organization_invitation_active_email_unique` UNIQUE(`activeEmailKey`)
);
--> statement-breakpoint
CREATE INDEX `organization_invitation_org_status_idx` ON `organization_invitations` (`organizationId`,`status`,`expiresAt`);