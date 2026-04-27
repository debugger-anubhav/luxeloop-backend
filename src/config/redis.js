const Redis = require('ioredis');
const env = require('./env');
const logger = require('./logger');

const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));

async function disconnect() {
  await redis.quit();
}

module.exports = { redis, disconnect };
