# PureSOC Backup And Restore Runbook

This runbook defines the repository-owned backup/restore entry points. It does not claim production disaster-recovery readiness until the commands are run against an approved target and the restored environment passes verification.

## Scope

Implemented locally:

- `npm run ops:backup` runs `scripts/backup.sh`.
- `npm run ops:restore` runs `scripts/restore.sh`.
- Backup creates a PostgreSQL `pg_dump --format=custom` file plus a manifest and checksum when `DATABASE_URL` is configured.
- Restore requires `PURESOC_RESTORE_CONFIRM=restore-to-target` and a `PURESOC_RESTORE_POSTGRES_FILE` before it can call `pg_restore`.
- Object-storage backup/restore can be included with explicit opt-in flags and `mc mirror` against the configured S3/MinIO endpoint.
- Dry-run mode is test-backed and prints the plan without touching a database.

Not implemented in these scripts:

- WORM or immutable archive writes.
- External signing or notarization.
- Production scheduler retention.
- A completed restore drill against a live or staging target.

## Backup

Dry-run:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/puresoc \
PURESOC_BACKUP_DRY_RUN=true \
npm run ops:backup
```

Actual PostgreSQL backup:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/puresoc \
PURESOC_BACKUP_DIR=./backups \
PURESOC_BACKUP_LABEL=pre-migration \
npm run ops:backup
```

The script writes:

- `postgres.dump`
- `manifest.json`
- `manifest.json.sha256`

Object-storage backup is opt-in:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/puresoc \
PURESOC_BACKUP_INCLUDE_OBJECT_STORAGE=true \
PURESOC_OBJECT_STORAGE_ENDPOINT=https://minio.example.internal \
PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID=... \
PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY=... \
PURESOC_OBJECT_STORAGE_BUCKET=puresoc-evidence \
npm run ops:backup
```

Use `umask 077` defaults from the script. Store the generated directory in the operator-approved encrypted backup location.

## Restore

Dry-run:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/puresoc_restore \
PURESOC_RESTORE_CONFIRM=restore-to-target \
PURESOC_RESTORE_DRY_RUN=true \
PURESOC_RESTORE_POSTGRES_FILE=./backups/example/postgres.dump \
npm run ops:restore
```

Actual restore:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/puresoc_restore \
PURESOC_RESTORE_CONFIRM=restore-to-target \
PURESOC_RESTORE_POSTGRES_FILE=./backups/example/postgres.dump \
npm run ops:restore
```

Default restore uses `pg_restore --clean --if-exists --no-owner --no-privileges`. Set `PURESOC_RESTORE_CLEAN=false` only for a disposable target prepared for additive restore testing.

Object-storage restore is opt-in and uses the same confirmation token:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/puresoc_restore \
PURESOC_RESTORE_CONFIRM=restore-to-target \
PURESOC_RESTORE_POSTGRES_FILE=./backups/example/postgres.dump \
PURESOC_RESTORE_INCLUDE_OBJECT_STORAGE=true \
PURESOC_RESTORE_OBJECT_STORAGE_DIR=./backups/example/object-storage \
PURESOC_OBJECT_STORAGE_ENDPOINT=https://minio.example.internal \
PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID=... \
PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY=... \
PURESOC_OBJECT_STORAGE_BUCKET=puresoc-evidence \
npm run ops:restore
```

## Verification

After restore, run:

```bash
npm run prisma:validate
npm run typecheck
npm test
docker compose config
```

For an environment drill, also verify:

- API and web `/health` endpoints.
- Registration/login against the restored database.
- Workspace selection and `/app/o/:organizationId/*` route access.
- Evidence/report metadata reads.
- Audit checkpoint reads.
- Microsoft connector health remains disconnected or fixture-safe unless approved credentials are configured.

## Open Production Work

Audit WORM/export, external signing, backup scheduling, retention enforcement, and restore drills remain operator/product hardening work. Do not use this runbook to claim production recovery objectives until the selected database and object-storage targets are exercised and tested.
