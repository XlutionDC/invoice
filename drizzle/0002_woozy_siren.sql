CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`window` integer NOT NULL,
	`attempts` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `store_credentials` (
	`shop_id` text PRIMARY KEY NOT NULL,
	`salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `store_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`shop_id` text NOT NULL,
	`credential_version` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `store_session_expiry` ON `store_sessions` (`expires_at`);