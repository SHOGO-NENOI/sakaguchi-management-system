CREATE TABLE `site_masters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`coordinates` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
