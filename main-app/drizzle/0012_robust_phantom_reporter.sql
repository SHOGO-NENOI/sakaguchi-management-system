ALTER TABLE `attendance_entries` ADD `deleted_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_entries` ADD `sync_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_entries` ADD `sync_error` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_entries` ADD `last_synced_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_entries` ADD `last_modified_source` text DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE `google_oauth_settings` ADD `last_calendar_sync_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `google_oauth_settings` ADD `sync_lock_until` integer DEFAULT 0 NOT NULL;