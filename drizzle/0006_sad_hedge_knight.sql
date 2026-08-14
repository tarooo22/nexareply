ALTER TABLE `organizations` ADD `aiPersona` varchar(180) DEFAULT 'Amadeo-ის სუნამოების კონსულტანტი' NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `aiPersona` varchar(180) NOT NULL DEFAULT 'Amadeo-ის სუნამოების კონსულტანტი';
ALTER TABLE `products` ADD `description` text NOT NULL;
