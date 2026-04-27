const cron = require('node-cron');
const { runRentalOverdueJob } = require('./rentalOverdue.job');
const { runRentalReminderJob } = require('./rentalReminder.job');
const logger = require('../config/logger');

function startScheduler() {
  cron.schedule('0 0 * * *', () => {
    runRentalOverdueJob();
  });

  cron.schedule('0 9 * * *', () => {
    runRentalReminderJob();
  });

  logger.info('Scheduler started');
}

module.exports = { startScheduler };
