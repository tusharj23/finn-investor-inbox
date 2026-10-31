CREATE TABLE `companies` (
	`symbol` text PRIMARY KEY NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_symbol` text NOT NULL,
	`data_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documents_company` ON `documents` (`company_symbol`);--> statement-breakpoint
CREATE TABLE `filings` (
	`id` text PRIMARY KEY NOT NULL,
	`company_symbol` text NOT NULL,
	`published_at` text NOT NULL,
	`data_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `filings_company_date` ON `filings` (`company_symbol`,`published_at`);--> statement-breakpoint
CREATE TABLE `http_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`data_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`data_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`document_id` text NOT NULL,
	`page` integer NOT NULL,
	`company_symbol` text NOT NULL,
	`text` text NOT NULL,
	`printed_page` text,
	PRIMARY KEY(`document_id`, `page`)
);
--> statement-breakpoint
CREATE INDEX `pages_company` ON `pages` (`company_symbol`);--> statement-breakpoint
CREATE TABLE `source_states` (
	`company_symbol` text NOT NULL,
	`source` text NOT NULL,
	`data_json` text NOT NULL,
	PRIMARY KEY(`company_symbol`, `source`)
);
