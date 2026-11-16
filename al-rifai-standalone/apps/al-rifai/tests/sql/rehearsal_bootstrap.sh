#!/bin/sh
# Isolated PostgreSQL rehearsal bootstrap. NEVER run against production.
# Usage: sh tests/sql/rehearsal_bootstrap.sh <container> <db-user>
set -eu
CONTAINER="${1:?container name required}"
USER="${2:-postgres}"
DB=alrifai

docker exec "$CONTAINER" psql -U "$USER" -d postgres -q -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB'" >/dev/null
docker exec "$CONTAINER" psql -U "$USER" -d postgres -q -c "DROP DATABASE IF EXISTS $DB"
docker exec "$CONTAINER" psql -U "$USER" -d postgres -q -c "DROP ROLE IF EXISTS ir_review_runtime"
docker exec "$CONTAINER" psql -U "$USER" -d postgres -q -c "DROP ROLE IF EXISTS alrifai_app"
docker exec "$CONTAINER" psql -U "$USER" -d postgres -q -c "CREATE DATABASE $DB"
docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -q -c "CREATE ROLE alrifai_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE"

for file in db/migrations/*.sql; do
  docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 -q -f - < "$file" || { echo "FAILED: $file"; exit 1; }
done
for file in db/migration-candidates/0031_cash_submissions_and_reviews.sql db/migration-candidates/0032_vessel_program_commands.sql; do
  [ -f "$file" ] || continue
  docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 -q -f - < "$file" || { echo "FAILED: $file"; exit 1; }
done
echo "BASELINE_OK"
