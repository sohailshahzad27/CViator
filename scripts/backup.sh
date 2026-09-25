#!/bin/sh
# scripts/backup.sh
# ---------------------------------------------------------------
# Runs inside the `backup` service defined in docker-compose.yml.
# Dumps the database once a day to ./backups (mounted from the host)
# and deletes dumps older than RETENTION_DAYS, so this needs no cron,
# no cloud storage, and no third-party image — just plain pg_dump.
#
# Restore a dump with:
#   docker exec -i cviator-postgres psql -U <DB_USER> -d <DB_NAME> < backups/cviator_YYYYMMDD_HHMMSS.sql
# ---------------------------------------------------------------
set -eu

RETENTION_DAYS="${RETENTION_DAYS:-14}"

echo "[backup] starting — daily dumps of '${PGDATABASE}', ${RETENTION_DAYS}-day retention"

while true; do
  stamp="$(date -u +%Y%m%d_%H%M%S)"
  out="/backups/cviator_${stamp}.sql"

  if pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f "$out"; then
    echo "[backup] $(date -u): wrote ${out}"
  else
    echo "[backup] $(date -u): pg_dump FAILED" >&2
  fi

  find /backups -name 'cviator_*.sql' -mtime "+${RETENTION_DAYS}" -delete

  sleep 86400
done
