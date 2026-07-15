CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`default_mode` text DEFAULT 'GUIDED' NOT NULL,
	`default_time_limit` integer DEFAULT 25 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);
--> statement-breakpoint
CREATE TABLE `account_rehearsals` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`incident_template_id` text NOT NULL,
	`incident_name` text NOT NULL,
	`repository_name` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`score` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`hints_used` integer DEFAULT 0 NOT NULL,
	`completed_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
