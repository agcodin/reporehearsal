CREATE TABLE IF NOT EXISTS `billing_customers` (
  `account_id` text PRIMARY KEY NOT NULL REFERENCES `accounts`(`id`) ON DELETE cascade,
  `stripe_customer_id` text NOT NULL UNIQUE,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `billing_subscriptions` (
  `account_id` text PRIMARY KEY NOT NULL REFERENCES `accounts`(`id`) ON DELETE cascade,
  `stripe_customer_id` text NOT NULL,
  `stripe_subscription_id` text NOT NULL UNIQUE,
  `plan_id` text NOT NULL,
  `cadence` text NOT NULL,
  `status` text NOT NULL,
  `cancel_at_period_end` integer DEFAULT 0 NOT NULL,
  `current_period_end` text,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `stripe_webhook_events` (
  `event_id` text PRIMARY KEY NOT NULL,
  `received_at` text NOT NULL
);
