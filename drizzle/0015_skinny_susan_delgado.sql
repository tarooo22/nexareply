CREATE TABLE `account_deletion_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`requesterEmail` varchar(320) NOT NULL,
	`verificationMethod` enum('authenticated_owner') NOT NULL DEFAULT 'authenticated_owner',
	`status` enum('requested','in_review','completed','rejected','cancelled') NOT NULL DEFAULT 'requested',
	`reason` varchar(500),
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`completedAt` timestamp,
	`reviewerUserId` int,
	`processingNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_deletion_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `account_deletion_org_status_idx` ON `account_deletion_requests` (`organizationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `account_deletion_requester_idx` ON `account_deletion_requests` (`requestedByUserId`,`createdAt`);