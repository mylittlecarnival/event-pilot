#!/bin/bash

PROD_HOST="db.jxywekbfedtywymqkrcn.supabase.co"
DEV_HOST="db.rbqohhxaooycgvpmcsdr.supabase.co"
BACKUP_DIR=~/Desktop/ep-supa-backups
BACKUP_FILE=$BACKUP_DIR/event_pilot_prod_$(date +%Y%m%d).sql
AUTH_BACKUP_FILE=$BACKUP_DIR/event_pilot_prod_auth_$(date +%Y%m%d).sql

echo "=== PRODUCTION IS READ-ONLY - NO CHANGES WILL BE MADE TO PROD ==="
echo ""

mkdir -p $BACKUP_DIR

echo "Dumping production public schema..."
pg_dump -h $PROD_HOST -U postgres -d postgres \
  --schema=public --data-only --no-owner --no-acl \
  -f $BACKUP_FILE

echo "Dumping production auth users..."
pg_dump -h $PROD_HOST -U postgres -d postgres \
  --data-only --no-owner --no-acl \
  -t auth.users -t auth.identities \
  -f $AUTH_BACKUP_FILE

echo "Truncating dev public tables..."
psql -h $DEV_HOST -U postgres -d postgres -c "
DO \$\$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;"

echo "Truncating dev auth tables..."
psql -h $DEV_HOST -U postgres -d postgres -c "
TRUNCATE auth.users CASCADE;"

echo "Restoring to dev (with FK checks disabled)..."
psql -h $DEV_HOST -U postgres -d postgres <<EOF
SET session_replication_role = replica;
\i $BACKUP_FILE
\i $AUTH_BACKUP_FILE
SET session_replication_role = DEFAULT;
EOF

echo ""
echo "=== Done! Production unchanged, dev updated. ==="
