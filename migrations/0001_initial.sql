CREATE TABLE `request_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`postal` text NOT NULL,
	`area` text NOT NULL,
	`services` text NOT NULL,
	`details` text NOT NULL,
	`language` text NOT NULL,
	`frequency` text NOT NULL,
	`preferred_date` text,
	`time_window` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `requests_date_idx` ON `requests` (`preferred_date`);--> statement-breakpoint
CREATE INDEX `requests_created_idx` ON `requests` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `confirmed_slot_unique` ON `requests` (`preferred_date`,`time_window`) WHERE "requests"."status" = 'confirmed';--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`service` text NOT NULL,
	`rating` integer NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reviews_status_idx` ON `reviews` (`status`,`created_at`);
ALTER TABLE requests ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires);
CREATE TABLE oauth_states(state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE google_tokens(email TEXT PRIMARY KEY, refresh_ciphertext TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE jobs(id TEXT PRIMARY KEY, kind TEXT NOT NULL, entity_id TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0, lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at INTEGER NOT NULL);
CREATE INDEX jobs_ready ON jobs(state,next_attempt,lease_until);
CREATE TABLE calendar_links(request_id TEXT PRIMARY KEY, event_id TEXT NOT NULL, calendar_id TEXT NOT NULL, synced_revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE request_revisions(request_id TEXT NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY(request_id,revision));
