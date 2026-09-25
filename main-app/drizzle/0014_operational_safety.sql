ALTER TABLE `attendance_entries` ADD `updated_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `site_documents` ADD `archived_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_name` text DEFAULT '子野井' NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer,
	`target_name` text DEFAULT '' NOT NULL,
	`before_json` text DEFAULT '' NOT NULL,
	`after_json` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
