CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text,
	`shop_id` text,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`created_at` text NOT NULL,
	`details` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_invoice_time` ON `audit_events` (`invoice_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_shop_time` ON `audit_events` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`shops` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_user_id_unique` ON `members` (`user_id`);--> statement-breakpoint
ALTER TABLE `invoices` ADD `state` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `updated_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `cancelled_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `cancelled_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `operation_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `last_actor_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `last_actor_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `change_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `kind` text DEFAULT 'receipt' NOT NULL;
--> statement-breakpoint
CREATE TRIGGER invoice_created_audit AFTER INSERT ON invoices BEGIN
 INSERT INTO audit_events (id,invoice_id,shop_id,action,actor_id,actor_name,created_at,details)
 VALUES ('create:' || NEW.id,NEW.id,NEW.shop_id,'created',NEW.actor_id,NEW.actor_name,NEW.created_at,json_object('after',json_object('id',NEW.id,'shop_id',NEW.shop_id,'kind',NEW.kind,'number',NEW.number,'date',NEW.date,'due_date',NEW.due_date,'customer_name',NEW.customer_name,'customer_contact',NEW.customer_contact,'items',NEW.items,'discount',NEW.discount,'shipping',NEW.shipping,'total',NEW.total,'notes',NEW.notes,'state',NEW.state,'version',NEW.version)));
END;
--> statement-breakpoint
CREATE TRIGGER invoice_changed_audit AFTER UPDATE OF version ON invoices WHEN NEW.version > OLD.version BEGIN
 INSERT INTO audit_events (id,invoice_id,shop_id,action,actor_id,actor_name,created_at,details)
 VALUES (NEW.operation_id,NEW.id,NEW.shop_id,CASE WHEN NEW.state='cancelled' AND OLD.state='active' THEN 'cancelled' ELSE 'edited' END,NEW.last_actor_id,NEW.last_actor_name,NEW.updated_at,json_object('before',json_object('id',OLD.id,'shop_id',OLD.shop_id,'kind',OLD.kind,'number',OLD.number,'date',OLD.date,'due_date',OLD.due_date,'customer_name',OLD.customer_name,'customer_contact',OLD.customer_contact,'items',OLD.items,'discount',OLD.discount,'shipping',OLD.shipping,'total',OLD.total,'notes',OLD.notes,'state',OLD.state,'version',OLD.version),'after',json_object('id',NEW.id,'shop_id',NEW.shop_id,'kind',NEW.kind,'number',NEW.number,'date',NEW.date,'due_date',NEW.due_date,'customer_name',NEW.customer_name,'customer_contact',NEW.customer_contact,'items',NEW.items,'discount',NEW.discount,'shipping',NEW.shipping,'total',NEW.total,'notes',NEW.notes,'state',NEW.state,'version',NEW.version),'reason',NEW.change_reason));
END;
--> statement-breakpoint
CREATE TRIGGER payment_created_audit AFTER INSERT ON payments BEGIN
 INSERT INTO audit_events (id,invoice_id,shop_id,action,actor_id,actor_name,created_at,details)
 SELECT 'payment:' || NEW.id,NEW.invoice_id,i.shop_id,CASE WHEN NEW.kind='refund' THEN 'refund' ELSE 'payment' END,NEW.actor_id,NEW.actor_name,NEW.created_at,json_object('amount',NEW.amount,'date',NEW.date,'method',NEW.method,'reference',NEW.reference,'kind',NEW.kind)
 FROM invoices i WHERE i.id=NEW.invoice_id;
END;
