CREATE TABLE `site_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_key` text NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_documents_object_key_unique` ON `site_documents` (`object_key`);