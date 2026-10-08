CREATE TABLE `payment_proofs` (
	`payment_id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`created_at` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `file_date` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `file_seq` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_daily_file_sequence` ON `invoices` (`shop_id`,`file_date`,`file_seq`);
--> statement-breakpoint
CREATE TRIGGER payment_proof_created_audit AFTER INSERT ON payment_proofs BEGIN
 INSERT INTO audit_events (id,invoice_id,shop_id,action,actor_id,actor_name,created_at,details)
 SELECT 'proof:' || NEW.payment_id,p.invoice_id,i.shop_id,'proof_attached',NEW.actor_id,NEW.actor_name,NEW.created_at,json_object('payment_id',NEW.payment_id,'file_name',NEW.file_name)
 FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE p.id=NEW.payment_id;
END;
