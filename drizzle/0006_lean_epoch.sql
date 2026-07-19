CREATE TABLE `daily_leaderboard_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date_key` text NOT NULL,
	`account_id` text NOT NULL,
	`session_id` text NOT NULL,
	`display_name` text NOT NULL,
	`score` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`completed_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `rehearsal_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_leaderboard_entries_session_id_unique` ON `daily_leaderboard_entries` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `daily_leaderboard_account_date_unique` ON `daily_leaderboard_entries` (`date_key`,`account_id`);--> statement-breakpoint
CREATE INDEX `daily_leaderboard_rank_idx` ON `daily_leaderboard_entries` (`date_key`,`score`,`duration_seconds`);
