const { Router } = require('express');
const controller = require('./cart.controller');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { addItemSchema } = require('./cart.schema');

const router = Router();

router.get('/',              authenticate,                        controller.getCart);
router.post('/items',        authenticate, validate(addItemSchema), controller.addItem);
router.patch('/items/:itemId', authenticate,                      controller.updateItem);
router.delete('/items/:itemId', authenticate,                     controller.removeItem);
router.delete('/',           authenticate,                        controller.clearCart);

module.exports = router;
