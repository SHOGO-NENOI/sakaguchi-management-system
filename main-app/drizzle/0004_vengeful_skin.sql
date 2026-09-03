CREATE TABLE `calendar_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`webhook_url` text DEFAULT '' NOT NULL,
	`sync_key` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE `attendance_entries` ADD `google_event_id` text DEFAULT '' NOT NULL;