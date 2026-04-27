const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redis } = require('../config/redis');

function createStore(prefix) {
  return new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix,
  });
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('rl:api:'),
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('rl:auth:'),
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('rl:upload:'),
  message: { success: false, message: 'Upload limit reached, please try again later.' },
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };
