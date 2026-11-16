CREATE TABLE `programs` (
	`id` text PRIMARY KEY NOT NULL,
	`motherVessel` text DEFAULT '' NOT NULL,
	`lighterVessel` text DEFAULT '' NOT NULL,
	`masterMobile` text DEFAULT '' NOT NULL,
	`destination` text DEFAULT '' NOT NULL,
	`escortName` text DEFAULT '' NOT NULL,
	`escortMobile` text DEFAULT '' NOT NULL,
	`startDate` text DEFAULT '' NOT NULL,
	`endDate` text DEFAULT '' NOT NULL,
	`shift` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Recorded' NOT NULL,
	`source` text DEFAULT 'Manual entry' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`duplicateOf` text,
	`createdAt` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`aId` text NOT NULL,
	`bId` text NOT NULL,
	`decision` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`createdAt` text NOT NULL
);
