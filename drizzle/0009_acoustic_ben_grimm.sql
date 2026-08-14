CREATE TABLE `product_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`productId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`byteSize` int NOT NULL,
	`width` int NOT NULL,
	`height` int NOT NULL,
	`altText` varchar(280),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdByUserId` int,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `product_assets_org_product_active_idx` ON `product_assets` (`organizationId`,`productId`,`deletedAt`);--> statement-breakpoint
CREATE INDEX `product_assets_org_primary_idx` ON `product_assets` (`organizationId`,`productId`,`isPrimary`);