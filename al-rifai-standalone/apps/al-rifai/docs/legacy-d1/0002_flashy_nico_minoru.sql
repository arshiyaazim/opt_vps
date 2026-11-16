CREATE TABLE `site_cash_archive` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`source` text NOT NULL,
	`employeePhone` text NOT NULL,
	`name` text NOT NULL,
	`method` text NOT NULL,
	`amountCents` integer NOT NULL,
	`details` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_operation_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_payment_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`details` text NOT NULL,
	`actor` text NOT NULL,
	`createdAt` text NOT NULL
);
