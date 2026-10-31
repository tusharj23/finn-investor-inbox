CREATE TABLE `market_history` (
	`company_symbol` text NOT NULL,
	`session_date` text NOT NULL,
	`data_json` text NOT NULL,
	PRIMARY KEY(`company_symbol`, `session_date`)
);
--> statement-breakpoint
CREATE INDEX `market_history_company_date` ON `market_history` (`company_symbol`,`session_date`);