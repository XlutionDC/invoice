CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`kind` text NOT NULL,
	`period` text NOT NULL,
	`seq` integer NOT NULL,
	`number` text NOT NULL,
	`date` text NOT NULL,
	`due_date` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_contact` text NOT NULL,
	`items` text NOT NULL,
	`discount` integer NOT NULL,
	`shipping` integer NOT NULL,
	`total` integer NOT NULL,
	`notes` text NOT NULL,
	`created_at` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_sequence` ON `invoices` (`shop_id`,`period`,`seq`);--> statement-breakpoint
CREATE INDEX `invoice_date` ON `invoices` (`date`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`date` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`reference` text NOT NULL,
	`created_at` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payment_invoice` ON `payments` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `payment_date` ON `payments` (`date`);