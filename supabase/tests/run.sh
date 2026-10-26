#!/usr/bin/env bash
# Applies the stub, every migration and every test to a throwaway database.
# Usage: DATABASE_URL=postgres://... supabase/tests/run.sh
set -euo pipefail
shopt -s nullglob
cd "$(dirname "$0")/.."
psql() { command psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X -t -A "$@" | sed "/^$/d"; }

psql -f tests/00_supabase_stub.sql
for f in migrations/*.sql; do echo "migrate  $f"; psql -f "$f"; done
for f in tests/[1-9]*.sql; do echo "test     $f"; psql -f "$f"; done
echo "All database tests passed."
