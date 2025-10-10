# Database Migration Rollback Strategy

## Overview

This document outlines the strategy for rolling back database migrations in case of issues during deployment or if a migration causes problems in production.

## Rollback Methods

### Method 1: Migration Rollback via Prisma (Recommended for Development)

Prisma doesn't have a built-in rollback command, but you can manually rollback by:

1. **Identify the migration to rollback to:**
   ```bash
   ls prisma/migrations/
   ```

2. **Manually apply the down migration:**
   - Prisma doesn't generate down migrations automatically
   - You need to manually create a reverse migration
   - Review the failed migration SQL and create inverse operations

3. **Create a new migration to reverse changes:**
   ```bash
   npx prisma migrate dev --name rollback_<feature_name>
   ```

### Method 2: Database Backup Restoration (Recommended for Production)

For production environments, always rely on database backups:

1. **Before deployment:**
   ```bash
   # Create a backup
   pg_dump -U username -d database_name -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).dump
   ```

2. **If rollback needed:**
   ```bash
   # Restore from backup
   pg_restore -U username -d database_name -v backup_<timestamp>.dump
   ```

### Method 3: Manual SQL Rollback

For specific problematic migrations:

1. **Review the migration file:**
   ```sql
   -- Check prisma/migrations/<timestamp>_<name>/migration.sql
   ```

2. **Write inverse SQL:**
   - DROP TABLE → recreate previous schema
   - ALTER TABLE ADD COLUMN → ALTER TABLE DROP COLUMN
   - CREATE INDEX → DROP INDEX
   - UPDATE data → restore previous values (if tracked)

3. **Execute rollback SQL:**
   ```bash
   psql -U username -d database_name -f rollback.sql
   ```

## Rollback Procedures by Scenario

### Scenario 1: Migration Failed During Application

**Symptoms:**
- Migration throws error mid-execution
- Prisma client generation fails
- Application won't start

**Steps:**
1. Check migration status:
   ```bash
   npx prisma migrate status
   ```

2. If migration partially applied:
   ```bash
   # Mark migration as rolled back in Prisma's migration table
   psql -U username -d database_name -c "DELETE FROM _prisma_migrations WHERE migration_name = '<failed_migration_name>';"
   ```

3. Manually reverse any applied changes from the failed migration

4. Fix the migration issue

5. Re-run migration:
   ```bash
   npx prisma migrate deploy
   ```

### Scenario 2: Migration Succeeded but Causes Runtime Issues

**Symptoms:**
- Application starts but has errors
- Data integrity issues
- Performance degradation

**Steps:**
1. Restore from backup (fastest method):
   ```bash
   pg_restore -U username -d database_name -v backup_<timestamp>.dump
   ```

2. Or create a new migration to fix issues:
   ```bash
   npx prisma migrate dev --name fix_<issue_name>
   ```

3. Test thoroughly before redeploying

### Scenario 3: Need to Rollback Multiple Migrations

**Symptoms:**
- Multiple migrations cause cumulative issues
- Need to return to a known good state

**Steps:**
1. Restore from backup to last known good state
2. Review all migrations applied since then
3. Create consolidated fix migration if needed
4. Test thoroughly in staging environment

## Prevention Strategies

### 1. Always Backup Before Migrations

```bash
#!/bin/bash
# Pre-migration backup script
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.dump"

echo "Creating backup: $BACKUP_FILE"
pg_dump -U $DB_USER -d $DB_NAME -F c -b -v -f $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "Backup created successfully"
    # Run migration
    npm run migrate:deploy
else
    echo "Backup failed. Aborting migration."
    exit 1
fi
```

### 2. Test Migrations in Staging

- Always test migrations in staging environment first
- Verify data integrity after migration
- Check application functionality
- Monitor performance

### 3. Use Transactions Where Possible

```sql
BEGIN;
-- Migration SQL here
-- If anything fails, entire migration rolls back
COMMIT;
```

### 4. Keep Migration Files Small and Focused

- One migration per logical change
- Easier to identify issues
- Simpler to rollback individual changes

### 5. Document Data Migrations

For migrations that modify data:

```typescript
// In seed.ts or migration script
// Document original data state
const originalData = await prisma.user.findMany();

// Perform migration
// ...

// Verify data integrity
const migratedData = await prisma.user.findMany();
// Add assertions
```

## Emergency Rollback Checklist

- [ ] Stop application to prevent further data changes
- [ ] Notify team and stakeholders
- [ ] Verify backup is available and recent
- [ ] Document current state (error messages, affected data)
- [ ] Restore from backup OR apply manual rollback
- [ ] Verify application functionality after rollback
- [ ] Review migration for issues
- [ ] Create fix and test in staging
- [ ] Deploy fix when ready

## Migration Safety Best Practices

1. **Idempotency**: Ensure migrations can run multiple times safely
2. **Backwards Compatibility**: Design migrations to work with both old and new code during rollout
3. **Data Preservation**: Never delete data in migration - archive instead
4. **Monitoring**: Add logging to track migration progress
5. **Testing**: Always test on copy of production data

## Contact and Escalation

For production rollback decisions:
1. Notify DevOps lead
2. Get approval from technical lead
3. Document decision and rationale
4. Follow incident response procedures

## Useful Commands

```bash
# Check migration status
npx prisma migrate status

# View applied migrations
psql -U username -d database_name -c "SELECT * FROM _prisma_migrations ORDER BY applied_steps_count DESC;"

# Create new migration
npx prisma migrate dev --name <name>

# Apply pending migrations (production)
npx prisma migrate deploy

# Validate Prisma schema
npx prisma validate

# Generate Prisma client
npx prisma generate
```

## References

- [Prisma Migration Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html)
- Project-specific deployment runbook: See DEPLOYMENT_GUIDE.md
