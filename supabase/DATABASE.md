# Database Management
Event Pilot Production
project_ref: jxywekbfedtywymqkrcn
Password: 9qOzyXbxzoni78ZH

Event Pilot Development
project_ref: rbqohhxaooycgvpmcsdr
password: KZD.nxj2dyg0rzj3wcv

## Environments

| Environment | Project Ref | URL |
|-------------|-------------|-----|
| **Dev** | `rbqohhxaooycgvpmcsdr` | https://rbqohhxaooycgvpmcsdr.supabase.co |
| **Production** | `jxywekbfedtywymqkrcn` | https://jxywekbfedtywymqkrcn.supabase.co |

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run db:push:dev` | Push migrations to dev |
| `npm run db:push:prod` | Push migrations to production |
| `npm run db:pull:dev` | Pull schema from dev |
| `npm run db:pull:prod` | Pull schema from production |
| `npm run db:seed:dev` | Seed dev database |
| `npm run db:new` | Create a new migration file |

## Typical Workflow

### Creating a New Migration

```bash
# 1. Create a new migration file
npm run db:new add_new_feature

# 2. Edit the migration file in supabase/migrations/

# 3. Test on dev
npm run db:push:dev

# 4. When ready, deploy to production
npm run db:push:prod
```

### Pulling Schema Changes

If you made changes directly in the Supabase dashboard:

```bash
# Pull from dev
npm run db:pull:dev

# Pull from production
npm run db:pull:prod
```

### Seeding Dev Database

```bash
# Runs TRUNCATE then INSERT (clears and reseeds)
npm run db:seed:dev
```

Or manually via psql:

```bash
psql "postgres://postgres:PASSWORD@db.rbqohhxaooycgvpmcsdr.supabase.co:5432/postgres" -f supabase/seed.sql
```

## Manual Supabase CLI Commands

```bash
# Link to a project
supabase link --project-ref <project-ref>

# Check which project is linked
cat supabase/.temp/project-ref

# Push migrations to linked project
supabase db push

# Pull schema from linked project
supabase db pull

# Create new migration
supabase migration new <name>

# View migration status
supabase migration list
```

## Environment Variables

### Development (`.env.development.local`)
- Auto-loaded when running `npm run dev`
- Points to dev Supabase project

### Production (`.env.local`)
- Used for production builds
- Points to production Supabase project

## TablePlus Connections

### Dev Database
- **Host**: db.rbqohhxaooycgvpmcsdr.supabase.co
- **Port**: 5432
- **User**: postgres
- **Database**: postgres

### Production Database
- **Host**: db.jxywekbfedtywymqkrcn.supabase.co
- **Port**: 5432
- **User**: postgres
- **Database**: postgres

## Files

| File | Purpose |
|------|---------|
| `supabase/migrations/*.sql` | Migration files (version controlled) |
| `supabase/seed.sql` | Test data for dev environment |
| `supabase/config.toml` | Supabase CLI configuration |
