const { Pool } = require('pg');
const env = require('./env');
const logger = require('./logger');

const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected pg pool error');
});

async function query(text, params) {
  return pool.query(text, params);
}

async function checkConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('PostgreSQL connected');
  } finally {
    client.release();
  }
}

function getPool() {
  return pool;
}

module.exports = { query, checkConnection, getPool, pool };
