CREATE INDEX `rehearsal_sessions_owner_date_idx` ON `rehearsal_sessions` (`owner_account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `rehearsal_sessions_expiry_idx` ON `rehearsal_sessions` (`expires_at`,`status`);--> statement-breakpoint
CREATE INDEX `repositories_owner_date_idx` ON `repositories` (`owner_account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `repositories_expiry_idx` ON `repositories` (`expires_at`);