CREATE TABLE `allocations` (
	`patient` text PRIMARY KEY NOT NULL,
	`seq` integer NOT NULL,
	`arm` text NOT NULL,
	`center` text NOT NULL,
	`stratum` text NOT NULL,
	`u` real NOT NULL,
	`score_a` integer NOT NULL,
	`score_b` integer NOT NULL,
	`prob_a` real NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`operator` text NOT NULL,
	`inputs` text NOT NULL,
	FOREIGN KEY (`patient`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `allocations_seq_unique` ON `allocations` (`seq`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient` text NOT NULL,
	`action` text NOT NULL,
	`before` text,
	`after` text,
	`at` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`center` text NOT NULL,
	`created` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`patient` text NOT NULL,
	`module` text NOT NULL,
	`slot` text NOT NULL,
	`data` text NOT NULL,
	`version` integer NOT NULL,
	`updated` text NOT NULL,
	`actor` text NOT NULL,
	FOREIGN KEY (`patient`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patient_module_slot` ON `records` (`patient`,`module`,`slot`);