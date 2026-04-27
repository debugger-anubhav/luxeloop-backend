const asyncHandler = require('../../utils/asyncHandler');
const service = require('./orders.service');

const checkout = asyncHandler(async (req, res) => {
  res.success(await service.checkout(req.user.id, req.body), 'Order placed', 201);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { orders, pagination } = await service.getMyOrders(req.user.id, req.query);
  res.paginated(orders, pagination, 'Orders fetched');
});

const getOrderDetail  = asyncHandler(async (req, res) => { res.success(await service.getOrderDetail(req.user.id, req.params.orderId), 'Order fetched'); });
const cancelOrder     = asyncHandler(async (req, res) => { res.success(await service.cancelOrder(req.user.id, req.params.orderId), 'Order cancelled'); });
const requestReturn   = asyncHandler(async (req, res) => { res.success(await service.requestReturn(req.user.id, req.params.orderId), 'Return requested'); });
const updateOrderStatus = asyncHandler(async (req, res) => { res.success(await service.updateOrderStatus(req.vendor.id, req.params.orderId, req.body), 'Order status updated'); });

module.exports = { checkout, getMyOrders, getOrderDetail, cancelOrder, requestReturn, updateOrderStatus };
