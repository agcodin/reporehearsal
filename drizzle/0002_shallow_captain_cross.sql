CREATE TABLE `rehearsal_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text,
	`access_token_hash` text NOT NULL,
	`repository_id` text NOT NULL,
	`repository_name` text NOT NULL,
	`incident_template_id` text NOT NULL,
	`difficulty` text NOT NULL,
	`mode` text NOT NULL,
	`time_limit_minutes` integer NOT NULL,
	`status` text NOT NULL,
	`hint_count` integer DEFAULT 0 NOT NULL,
	`hypotheses_json` text DEFAULT '[]' NOT NULL,
	`timeline_json` text DEFAULT '[]' NOT NULL,
	`workspace_key` text,
	`score` integer,
	`validation_json` text,
	`report_json` text,
	`created_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text,
	`access_token_hash` text NOT NULL,
	`source` text NOT NULL,
	`external_ref` text,
	`name` text NOT NULL,
	`analysis_json` text NOT NULL,
	`object_key` text NOT NULL,
	`file_count` integer NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
