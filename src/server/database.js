const { Pool } = require('pg');

const databaseUrl = process.env.POSTGRES_PRIVATE_URL || process.env.DATABASE_URL;
let pool = null;
if (databaseUrl) {
  pool = new Pool({ connectionString: databaseUrl });
}

async function initializeDatabase() {
  if (!pool) {
    console.warn('No POSTGRES_PRIVATE_URL/DATABASE_URL set; study rows are not persisted on the server.');
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS study_rows (
        id SERIAL PRIMARY KEY,
        word TEXT NOT NULL DEFAULT '',
        translation TEXT NOT NULL DEFAULT '',
        translation2 TEXT NOT NULL DEFAULT '',
        furigana TEXT NOT NULL DEFAULT '',
        image TEXT,
        audio TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query("ALTER TABLE study_rows ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''");
  } catch (error) {
    console.error('Failed to create study_rows table:', error.message);
  }
}

function requireDatabase(_request, response, next) {
  if (!pool) return response.status(503).json({ error: 'Database not configured.' });
  next();
}

module.exports = { pool, initializeDatabase, requireDatabase };