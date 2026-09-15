const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { attachResponseHelpers } = require('./utils/ApiResponse');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes         = require('./modules/auth/auth.routes');
const usersRoutes        = require('./modules/users/users.routes');
const vendorsRoutes      = require('./modules/vendors/vendors.routes');
const categoriesRoutes   = require('./modules/categories/categories.routes');
const productsRoutes     = require('./modules/products/products.routes');
const inventoryRoutes    = require('./modules/inventory/inventory.routes');
const cartRoutes         = require('./modules/cart/cart.routes');
const ordersRoutes       = require('./modules/orders/orders.routes');
const rentalsRoutes      = require('./modules/rentals/rentals.routes');
const paymentsRoutes     = require('./modules/payments/payments.routes');
const reviewsRoutes      = require('./modules/reviews/reviews.routes');
const wishlistsRoutes    = require('./modules/wishlists/wishlists.routes');
const couponsRoutes      = require('./modules/coupons/coupons.routes');
const addressesRoutes    = require('./modules/addresses/addresses.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const homepageRoutes      = require('./modules/homepage/homepage.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(attachResponseHelpers);

app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', apiLimiter);

app.use('/api/v1/auth',          authRoutes);
app.use('/api/v1/users',         usersRoutes);
app.use('/api/v1/vendors',       vendorsRoutes);
app.use('/api/v1/categories',    categoriesRoutes);
app.use('/api/v1/products',      productsRoutes);
app.use('/api/v1/inventory',     inventoryRoutes);
app.use('/api/v1/cart',          cartRoutes);
app.use('/api/v1/orders',        ordersRoutes);
app.use('/api/v1/rentals',       rentalsRoutes);
app.use('/api/v1/payments',      paymentsRoutes);
app.use('/api/v1/reviews',       reviewsRoutes);
app.use('/api/v1/wishlist',      wishlistsRoutes);
app.use('/api/v1/coupons',       couponsRoutes);
app.use('/api/v1/addresses',     addressesRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/homepage',      homepageRoutes);

app.use(errorHandler);

module.exports = app;
