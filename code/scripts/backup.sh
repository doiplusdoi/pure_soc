#!/usr/bin/env sh
set -eu

usage() {
  cat <<'EOF'
PureSOC backup

Required:
  DATABASE_URL                         PostgreSQL connection string to dump.

Optional:
  PURESOC_BACKUP_DIR                   Output directory. Defaults to ./backups.
  PURESOC_BACKUP_LABEL                 Human label for the backup set.
  PURESOC_BACKUP_DRY_RUN=true          Print the plan without writing a dump.
  PURESOC_BACKUP_INCLUDE_OBJECT_STORAGE=true
                                       Export S3/MinIO bucket objects with mc mirror.
  PURESOC_OBJECT_STORAGE_ENDPOINT      Required when object-storage backup is enabled.
  PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID Required when object-storage backup is enabled.
  PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY
                                       Required when object-storage backup is enabled.
  PURESOC_OBJECT_STORAGE_BUCKET        Required when object-storage backup is enabled.

This script creates a pg_dump custom-format backup and a small manifest. It does
not prove production backup/restore readiness until run against the approved
target and followed by restore verification.
EOF
}

if [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required for PostgreSQL backup." >&2
  exit 2
fi

backup_dir="${PURESOC_BACKUP_DIR:-./backups}"
backup_label="${PURESOC_BACKUP_LABEL:-manual}"
dry_run="${PURESOC_BACKUP_DRY_RUN:-false}"
include_object_storage="${PURESOC_BACKUP_INCLUDE_OBJECT_STORAGE:-false}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_id="puresoc-${backup_label}-${timestamp}"
target_dir="${backup_dir%/}/${backup_id}"
postgres_file="${target_dir}/postgres.dump"
manifest_file="${target_dir}/manifest.json"
object_storage_dir="${target_dir}/object-storage"

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
    return
  fi
  echo "sha256sum or shasum is required to write backup checksums." >&2
  exit 2
}

echo "PureSOC backup plan"
echo "  backup_id: ${backup_id}"
echo "  target_dir: ${target_dir}"
echo "  postgres_dump: ${postgres_file}"
if [ "$include_object_storage" = "true" ]; then
  echo "  object_storage: ${object_storage_dir}"
  echo "  object_storage_bucket: ${PURESOC_OBJECT_STORAGE_BUCKET:-not_configured}"
else
  echo "  object_storage: not_included"
fi

if [ "$dry_run" = "true" ]; then
  echo "Dry run only; no backup files were written."
  exit 0
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required to create a PostgreSQL backup." >&2
  exit 2
fi

umask 077
mkdir -p "$target_dir"

pg_dump --format=custom --no-owner --no-privileges --file "$postgres_file" "$DATABASE_URL"
postgres_sha256="$(hash_file "$postgres_file")"
object_storage_included="false"
object_storage_reason="not requested"

if [ "$include_object_storage" = "true" ]; then
  if ! command -v mc >/dev/null 2>&1; then
    echo "mc is required when PURESOC_BACKUP_INCLUDE_OBJECT_STORAGE=true." >&2
    exit 2
  fi
  if [ -z "${PURESOC_OBJECT_STORAGE_ENDPOINT:-}" ] ||
    [ -z "${PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID:-}" ] ||
    [ -z "${PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY:-}" ] ||
    [ -z "${PURESOC_OBJECT_STORAGE_BUCKET:-}" ]; then
    echo "Object-storage endpoint, access key, secret key, and bucket are required for object backup." >&2
    exit 2
  fi
  mkdir -p "$object_storage_dir"
  mc alias set puresoc-backup "$PURESOC_OBJECT_STORAGE_ENDPOINT" "$PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID" "$PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY" >/dev/null
  mc mirror "puresoc-backup/${PURESOC_OBJECT_STORAGE_BUCKET}" "$object_storage_dir"
  object_storage_included="true"
  object_storage_reason="mc mirror export"
fi

cat >"$manifest_file" <<EOF
{
  "schemaVersion": "puresoc.backup.v1",
  "backupId": "${backup_id}",
  "createdAt": "${timestamp}",
  "postgres": {
    "file": "postgres.dump",
    "format": "pg_dump_custom",
    "sha256": "${postgres_sha256}"
  },
  "objectStorage": {
    "included": ${object_storage_included},
    "path": "object-storage",
    "reason": "${object_storage_reason}"
  },
  "restoreVerification": {
    "required": true,
    "script": "scripts/restore.sh"
  }
}
EOF

hash_file "$manifest_file" >"${manifest_file}.sha256"

echo "Backup created: ${target_dir}"
echo "Restore verification remains required before claiming backup readiness."
