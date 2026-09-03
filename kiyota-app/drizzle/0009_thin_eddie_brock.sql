CREATE TABLE `google_oauth_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`client_id` text DEFAULT '' NOT NULL,
	`client_secret_encrypted` text DEFAULT '' NOT NULL,
	`access_token_encrypted` text DEFAULT '' NOT NULL,
	`refresh_token_encrypted` text DEFAULT '' NOT NULL,
	`access_token_expires_at` integer DEFAULT 0 NOT NULL,
	`connected_email` text DEFAULT '' NOT NULL,
	`connected_name` text DEFAULT '' NOT NULL,
	`connected_at` text DEFAULT '' NOT NULL
);
