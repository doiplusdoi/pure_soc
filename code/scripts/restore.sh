#!/usr/bin/env sh
set -eu

usage() {
  cat <<'EOF'
PureSOC restore

Required:
  DATABASE_URL                         PostgreSQL connection string to restore into.
  PURESOC_RESTORE_POSTGRES_FILE        pg_dump custom-format file to restore.
  PURESOC_RESTORE_CONFIRM=restore-to-target
                                       Required safety token.

Optional:
  PURESOC_RESTORE_DRY_RUN=true         Print the restore plan without touching the database.
  PURESOC_RESTORE_CLEAN=true           Use pg_restore --clean --if-exists. Default true.
  PURESOC_RESTORE_INCLUDE_OBJECT_STORAGE=true
                                       Restore S3/MinIO objects with mc mirror.
  PURESOC_RESTORE_OBJECT_STORAGE_DIR   Directory exported by scripts/backup.sh.
  PURESOC_OBJECT_STORAGE_ENDPOINT      Required when object-storage restore is enabled.
  PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID Required when object-storage restore is enabled.
  PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY
                                       Required when object-storage restore is enabled.
  PURESOC_OBJECT_STORAGE_BUCKET        Required when object-storage restore is enabled.

Object-storage restore is opt-in and requires the same explicit restore
confirmation as PostgreSQL restore.
EOF
}

if [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ "${PURESOC_RESTORE_CONFIRM:-}" != "restore-to-target" ]; then
  echo "Restore requires PURESOC_RESTORE_CONFIRM=restore-to-target." >&2
  exit 2
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required for PostgreSQL restore." >&2
  exit 2
fi

postgres_file="${PURESOC_RESTORE_POSTGRES_FILE:-}"
if [ -z "$postgres_file" ]; then
  echo "PURESOC_RESTORE_POSTGRES_FILE is required." >&2
  exit 2
fi

if [ ! -f "$postgres_file" ]; then
  echo "Restore file does not exist: $postgres_file" >&2
  exit 2
fi

dry_run="${PURESOC_RESTORE_DRY_RUN:-false}"
clean="${PURESOC_RESTORE_CLEAN:-true}"
include_object_storage="${PURESOC_RESTORE_INCLUDE_OBJECT_STORAGE:-false}"
object_storage_dir="${PURESOC_RESTORE_OBJECT_STORAGE_DIR:-}"

echo "PureSOC restore plan"
echo "  postgres_dump: ${postgres_file}"
echo "  clean_before_restore: ${clean}"
if [ "$include_object_storage" = "true" ]; then
  echo "  object_storage: ${object_storage_dir:-not_configured}"
  echo "  object_storage_bucket: ${PURESOC_OBJECT_STORAGE_BUCKET:-not_configured}"
else
  echo "  object_storage: not_restored"
fi

if [ "$dry_run" = "true" ]; then
  echo "Dry run only; target database was not modified."
  exit 0
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required to restore a PostgreSQL backup." >&2
  exit 2
fi

if [ "$clean" = "true" ]; then
  pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" "$postgres_file"
else
  pg_restore --no-owner --no-privileges --dbname "$DATABASE_URL" "$postgres_file"
fi

if [ "$include_object_storage" = "true" ]; then
  if ! command -v mc >/dev/null 2>&1; then
    echo "mc is required when PURESOC_RESTORE_INCLUDE_OBJECT_STORAGE=true." >&2
    exit 2
  fi
  if [ -z "$object_storage_dir" ] || [ ! -d "$object_storage_dir" ]; then
    echo "PURESOC_RESTORE_OBJECT_STORAGE_DIR must point to an exported object-storage directory." >&2
    exit 2
  fi
  if [ -z "${PURESOC_OBJECT_STORAGE_ENDPOINT:-}" ] ||
    [ -z "${PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID:-}" ] ||
    [ -z "${PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY:-}" ] ||
    [ -z "${PURESOC_OBJECT_STORAGE_BUCKET:-}" ]; then
    echo "Object-storage endpoint, access key, secret key, and bucket are required for object restore." >&2
    exit 2
  fi
  mc alias set puresoc-restore "$PURESOC_OBJECT_STORAGE_ENDPOINT" "$PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID" "$PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY" >/dev/null
  mc mirror --overwrite "$object_storage_dir" "puresoc-restore/${PURESOC_OBJECT_STORAGE_BUCKET}"
fi

echo "PostgreSQL restore completed."
echo "Run application health checks, Prisma validation, and a product workflow smoke before claiming restore readiness."
