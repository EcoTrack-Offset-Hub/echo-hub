# EcoTrack backend

Required environment variables: `DATABASE_URL`, `SUPABASE_SSL_ROOT_CERT_PATH` (the server-only path to the root certificate downloaded from Supabase Database Settings), and `AUTH_JWT_SECRET` (at least 32 characters). The backend upgrades the connection to `sslmode=verify-full` and uses that CA certificate; it never disables certificate verification or falls back to in-memory/PGlite storage.

Schema creation is migration-owned: apply `migrations/001_auth_company_emissions.sql` once to the target database before starting the backend. Startup only verifies that the schema exists, then seeds test users.

Start with `npm run backend` from the repository root. On first successful PostgreSQL start it creates the required tables and seeds `admin@ecotrack.test`, `companya@ecotrack.test`, and `companyb@ecotrack.test`. The development password is `EcoTrackDemo!2026`, or set `SEED_PASSWORD` before the first run.

Use `Authorization: Bearer <token>` for protected Emissions endpoints. Company users are scoped from their token; supplied company IDs cannot elevate access. Admins must specify `companyId` when creating an emission.
