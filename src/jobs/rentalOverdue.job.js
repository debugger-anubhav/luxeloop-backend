const { query } = require('../config/db');
const { createNotification } = require('../modules/notifications/notifications.service');
const logger = require('../config/logger');

async function runRentalOverdueJob() {
  logger.info('Running rental overdue job');
  try {
    const { rows } = await query(
      `SELECT r.id, r.order_item_id, oi.variant_id, oi.quantity, oi.vendor_id, o.user_id
       FROM rentals r
       JOIN order_items oi ON oi.id = r.order_item_id
       JOIN orders o ON o.id = oi.order_id
       WHERE r.status = 'active' AND r.expected_return_date < CURRENT_DATE`
    );

    for (const rental of rows) {
      await query('UPDATE rentals SET status = \'overdue\' WHERE id = $1', [rental.id]);

      createNotification(rental.user_id, {
        type: 'rental',
        title: 'Rental Overdue',
        body: 'Your rental is overdue. Please return the item immediately.',
        payload: { rental_id: rental.id },
      }).catch(() => {});

      const { rows: vendorUserRows } = await query(
        'SELECT user_id FROM vendors WHERE id = $1',
        [rental.vendor_id]
      );
      if (vendorUserRows[0]) {
        createNotification(vendorUserRows[0].user_id, {
          type: 'rental',
          title: 'Rental Overdue',
          body: 'A rental item is overdue and has not been returned.',
          payload: { rental_id: rental.id },
        }).catch(() => {});
      }
    }

    logger.info({ count: rows.length }, 'Overdue rentals processed');
  } catch (err) {
    logger.error({ err }, 'Rental overdue job failed');
  }
}

module.exports = { runRentalOverdueJob };
