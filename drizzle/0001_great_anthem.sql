CREATE TABLE `account_repositories` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`source` text NOT NULL,
	`external_id` text,
	`name` text NOT NULL,
	`display_ref` text NOT NULL,
	`language` text NOT NULL,
	`framework` text NOT NULL,
	`database` text NOT NULL,
	`orm` text NOT NULL,
	`test_framework` text NOT NULL,
	`package_manager` text NOT NULL,
	`file_count` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_repositories_source_unique` ON `account_repositories` (`account_id`,`source`,`external_id`);