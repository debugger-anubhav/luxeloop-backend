const pino = require('pino');

const env = process.env.NODE_ENV || 'development';

const logger = pino(
  env === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } }, level: 'debug' }
    : { level: 'info' }
);

module.exports = logger;
