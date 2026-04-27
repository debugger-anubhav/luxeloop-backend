const { query } = require('../config/db');
const { createNotification } = require('../modules/notifications/notifications.service');
const logger = require('../config/logger');

async function runRentalReminderJob() {
  logger.info('Running rental reminder job');
  try {
    const { rows } = await query(
      `SELECT r.id, o.user_id
       FROM rentals r
       JOIN order_items oi ON oi.id = r.order_item_id
       JOIN orders o ON o.id = oi.order_id
       WHERE r.status = 'active'
         AND r.expected_return_date = CURRENT_DATE + INTERVAL '2 days'`
    );

    for (const rental of rows) {
      const alreadyNotified = await query(
        `SELECT id FROM notifications
         WHERE user_id = $1 AND type = 'rental'
           AND payload->>'rental_id' = $2
           AND title = 'Return Reminder'
           AND created_at > NOW() - INTERVAL '1 day'`,
        [rental.user_id, rental.id]
      );

      if (alreadyNotified.rows.length) continue;

      createNotification(rental.user_id, {
        type: 'rental',
        title: 'Return Reminder',
        body: 'Your rental is due in 2 days. Please plan your return.',
        payload: { rental_id: rental.id },
      }).catch(() => {});
    }

    logger.info({ count: rows.length }, 'Rental reminders sent');
  } catch (err) {
    logger.error({ err }, 'Rental reminder job failed');
  }
}

module.exports = { runRentalReminderJob };
