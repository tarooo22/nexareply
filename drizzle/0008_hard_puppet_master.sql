CREATE TABLE `organization_onboarding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`assistantReviewedAt` timestamp,
	`dismissedAt` timestamp,
	`dismissedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_onboarding_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_onboarding_org_unique` UNIQUE(`organizationId`)
);
