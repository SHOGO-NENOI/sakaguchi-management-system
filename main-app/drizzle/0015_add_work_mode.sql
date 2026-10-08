ALTER TABLE `attendance_entries` ADD `work_mode` text DEFAULT '通常勤務' NOT NULL;
--> statement-breakpoint
UPDATE `attendance_entries` SET `work_mode` = '出張' WHERE `business_trip` = 1;
