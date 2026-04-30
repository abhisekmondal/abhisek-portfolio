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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
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
