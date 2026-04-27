const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const { checkConnection, pool } = require('./src/config/db');
const { disconnect: disconnectRedis } = require('./src/config/redis');
const { startScheduler } = require('./src/jobs/scheduler');

const server = http.createServer(app);

async function start() {
  await checkConnection();
  startScheduler();

  server.listen(env.PORT, () => {
    logger.info(`Vastra API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

async function shutdown(signal) {
  logger.info({ signal }, 'Graceful shutdown initiated');
  server.close(async () => {
    await pool.end();
    await disconnectRedis();
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
