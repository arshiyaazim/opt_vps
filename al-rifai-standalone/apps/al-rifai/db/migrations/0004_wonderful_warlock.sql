CREATE TABLE "site_source_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"datasetId" text NOT NULL,
	"kind" text NOT NULL,
	"payload" text NOT NULL,
	"contentHash" text NOT NULL
);

