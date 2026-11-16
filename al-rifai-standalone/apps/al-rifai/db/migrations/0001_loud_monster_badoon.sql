CREATE TABLE "datasets" (
	"id" text PRIMARY KEY NOT NULL,
	"importedAt" text NOT NULL
);

ALTER TABLE "programs" ADD "details" text DEFAULT '{}' NOT NULL;
