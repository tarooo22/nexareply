CREATE TABLE `knowledge_draft_facts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`sourceId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT 'general',
	`confidence` int NOT NULL DEFAULT 0,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedKnowledgeFactId` int,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_draft_facts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`sourceType` enum('composer') NOT NULL DEFAULT 'composer',
	`title` varchar(180) NOT NULL,
	`originalText` text NOT NULL,
	`status` enum('draft','partially_approved','approved','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`createdByUserId` int,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `knowledge_drafts_org_source_status_idx` ON `knowledge_draft_facts` (`organizationId`,`sourceId`,`status`);--> statement-breakpoint
CREATE INDEX `knowledge_sources_org_status_idx` ON `knowledge_sources` (`organizationId`,`status`,`createdAt`);