CREATE TABLE `attendance_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_date` text NOT NULL,
	`work_type` text NOT NULL,
	`start_time` text DEFAULT '' NOT NULL,
	`end_time` text DEFAULT '' NOT NULL,
	`site` text DEFAULT '' NOT NULL,
	`work` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
