ALTER TABLE `attendance_entries` ADD `business_trip` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_entries` ADD `dinner_type` text DEFAULT '' NOT NULL;