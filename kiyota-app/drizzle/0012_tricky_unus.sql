CREATE TABLE `master_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `master_options_type_name_unique` ON `master_options` (`type`,`name`);--> statement-breakpoint
ALTER TABLE `site_masters` ADD `archived_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tool_items` ADD `archived_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tool_sets` ADD `archived_at` text DEFAULT '' NOT NULL;