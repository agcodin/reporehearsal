CREATE TABLE IF NOT EXISTS `rehearsal_funnels` (
  `session_id` text PRIMARY KEY NOT NULL,
  `owner_account_id` text,
  `incident_template_id` text NOT NULL,
  `repository_id` text NOT NULL,
  `repository_name` text NOT NULL,
  `language` text DEFAULT 'Unknown' NOT NULL,
  `created_at` text NOT NULL,
  `started_at` text,
  `completed_at` text,
  `last_event` text NOT NULL,
  `last_event_at` text NOT NULL,
  `evidence_count` integer DEFAULT 0 NOT NULL,
  `edit_count` integer DEFAULT 0 NOT NULL,
  `command_count` integer DEFAULT 0 NOT NULL,
  `score` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `custom_incidents` (
  `id` text PRIMARY KEY NOT NULL,
  `team_id` text NOT NULL REFERENCES `teams`(`id`) ON DELETE cascade,
  `repository_id` text NOT NULL,
  `repository_name` text NOT NULL,
  `title` text NOT NULL,
  `signal` text NOT NULL,
  `root_cause` text NOT NULL,
  `target_path` text NOT NULL,
  `safe_snippet` text NOT NULL,
  `faulty_snippet` text NOT NULL,
  `evidence_json` text NOT NULL,
  `validation_contract` text NOT NULL,
  `objective` text NOT NULL,
  `status` text NOT NULL,
  `source_type` text NOT NULL,
  `source_ref` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `custom_incidents_team_status_idx` ON `custom_incidents` (`team_id`,`status`,`updated_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `screening_campaigns` (
  `id` text PRIMARY KEY NOT NULL,
  `team_id` text NOT NULL REFERENCES `teams`(`id`) ON DELETE cascade,
  `owner_account_id` text NOT NULL,
  `title` text NOT NULL,
  `repository_id` text NOT NULL,
  `repository_name` text NOT NULL,
  `incident_template_id` text NOT NULL,
  `incident_name` text NOT NULL,
  `public_token_hash` text NOT NULL UNIQUE,
  `public_token` text NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `screening_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL REFERENCES `screening_campaigns`(`id`) ON DELETE cascade,
  `session_id` text NOT NULL UNIQUE,
  `candidate_name` text NOT NULL,
  `candidate_email` text NOT NULL,
  `created_at` text NOT NULL
);
