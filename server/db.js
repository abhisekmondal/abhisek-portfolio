const { Pool } = require("pg");

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.PGHOST || "10.0.2.90",
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || "postgres",
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "postgres",
        ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
      },
);

async function initDatabase() {
  const emailVerificationColumn = await pool.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'email_verified_at'
  `);
  const shouldMarkLegacyUsersVerified = emailVerificationColumn.rowCount === 0;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      email_verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS resumes (
      id UUID PRIMARY KEY,
      client_id TEXT NOT NULL DEFAULT 'default',
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      owner_email TEXT,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
  `);

  if (shouldMarkLegacyUsersVerified) {
    await pool.query(`
      UPDATE users
      SET email_verified_at = COALESCE(email_verified_at, created_at, NOW())
      WHERE email_verified_at IS NULL;
    `);
  }

  await pool.query(`
    UPDATE users
    SET email_verified_at = NULL,
        updated_at = NOW()
    WHERE EXISTS (
      SELECT 1
      FROM email_verification_tokens evt
      WHERE evt.user_id = users.id
        AND evt.used_at IS NULL
        AND evt.expires_at > NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE resumes
    ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT 'default';
  `);

  await pool.query(`
    ALTER TABLE resumes
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS users_email_idx
    ON users (LOWER(email));
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
    ON password_reset_tokens (user_id, expires_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
    ON email_verification_tokens (user_id, expires_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS resumes_updated_at_idx
    ON resumes (updated_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS resumes_client_updated_at_idx
    ON resumes (client_id, updated_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS resumes_user_updated_at_idx
    ON resumes (user_id, updated_at DESC);
  `);
}

module.exports = {
  initDatabase,
  pool,
};
