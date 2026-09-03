CREATE TABLE `tool_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tool_sets_category_name_unique` ON `tool_sets` (`category`,`name`);--> statement-breakpoint
CREATE TABLE `tool_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`set_id` integer NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `tool_sets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tool_items_set_name_unique` ON `tool_items` (`set_id`,`name`);--> statement-breakpoint
CREATE TABLE `tool_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`check_date` text NOT NULL,
	`item_id` integer NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `tool_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tool_checks_date_item_unique` ON `tool_checks` (`check_date`,`item_id`);
