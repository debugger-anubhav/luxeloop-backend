-- Vastra initial schema

-- Enums
CREATE TYPE user_role         AS ENUM ('customer', 'vendor', 'admin');
CREATE TYPE vendor_status     AS ENUM ('pending', 'active', 'suspended', 'rejected');
CREATE TYPE listing_type      AS ENUM ('rent', 'sale', 'both');
CREATE TYPE order_status      AS ENUM ('pending_payment','payment_failed','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','return_initiated','returned');
CREATE TYPE order_type        AS ENUM ('rent', 'sale', 'mixed');
CREATE TYPE item_type         AS ENUM ('rent', 'sale');
CREATE TYPE payment_gateway   AS ENUM ('razorpay', 'stripe', 'cod');
CREATE TYPE payment_status    AS ENUM ('initiated','pending','success','failed','refunded','partially_refunded');
CREATE TYPE payment_type      AS ENUM ('charge','refund','deposit_hold','deposit_release');
CREATE TYPE deposit_status    AS ENUM ('not_applicable','held','released','forfeited');
CREATE TYPE rental_status     AS ENUM ('scheduled','picked_up','active','return_initiated','returned','overdue','cancelled');
CREATE TYPE discount_type     AS ENUM ('flat', 'percent');
CREATE TYPE coupon_scope      AS ENUM ('rent', 'sale', 'all');
CREATE TYPE notification_type AS ENUM ('order','payment','rental','promotion','system');

-- Section 1: Identity & Auth
CREATE TABLE users (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) UNIQUE,
    phone               VARCHAR(15)  UNIQUE,
    password_hash       TEXT         NOT NULL,
    full_name           VARCHAR(150) NOT NULL,
    avatar_url          TEXT,
    role                user_role    NOT NULL DEFAULT 'customer',
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    is_email_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    is_phone_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    device_info JSONB,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE otp_codes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose     VARCHAR(30) NOT NULL,
    code_hash   TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Section 2: Vendor Profiles
CREATE TABLE vendors (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID          NOT NULL UNIQUE REFERENCES users(id),
    shop_name        VARCHAR(150)  NOT NULL,
    slug             VARCHAR(160)  UNIQUE,
    description      TEXT,
    gst_number       VARCHAR(20),
    pan_number       VARCHAR(12),
    logo_url         TEXT,
    banner_url       TEXT,
    status           vendor_status NOT NULL DEFAULT 'pending',
    is_verified      BOOLEAN       NOT NULL DEFAULT FALSE,
    rating_avg       NUMERIC(3,2)  NOT NULL DEFAULT 0.00,
    rating_count     INT           NOT NULL DEFAULT 0,
    bank_account_id  UUID,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE vendor_bank_accounts (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID         NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    account_holder  VARCHAR(150) NOT NULL,
    bank_name       VARCHAR(100) NOT NULL,
    account_number  TEXT         NOT NULL,
    ifsc_code       VARCHAR(15)  NOT NULL,
    is_primary      BOOLEAN      NOT NULL DEFAULT FALSE,
    verified        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE vendors ADD CONSTRAINT fk_vendor_bank
    FOREIGN KEY (bank_account_id) REFERENCES vendor_bank_accounts(id) DEFERRABLE INITIALLY DEFERRED;

-- Section 3: Addresses
CREATE TABLE addresses (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label       VARCHAR(30)  NOT NULL DEFAULT 'Home',
    full_name   VARCHAR(150) NOT NULL,
    phone       VARCHAR(15)  NOT NULL,
    line1       TEXT         NOT NULL,
    line2       TEXT,
    landmark    VARCHAR(150),
    city        VARCHAR(100) NOT NULL,
    state       VARCHAR(100) NOT NULL,
    pincode     VARCHAR(10)  NOT NULL,
    country     VARCHAR(60)  NOT NULL DEFAULT 'India',
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Section 4: Catalog
CREATE TABLE categories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID         REFERENCES categories(id) ON DELETE SET NULL,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(110) NOT NULL UNIQUE,
    description TEXT,
    image_url   TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id           UUID          NOT NULL REFERENCES vendors(id),
    category_id         UUID          NOT NULL REFERENCES categories(id),
    name                VARCHAR(250)  NOT NULL,
    slug                VARCHAR(270),
    description         TEXT,
    listing_type        listing_type  NOT NULL DEFAULT 'both',
    deposit_amount      NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    brand               VARCHAR(100),
    fabric              VARCHAR(100),
    care_instructions   TEXT,
    tags                TEXT[]        DEFAULT '{}',
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
    rating_avg          NUMERIC(3,2)  NOT NULL DEFAULT 0.00,
    review_count        INT           NOT NULL DEFAULT 0,
    search_vector       TSVECTOR,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE product_variants (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size                VARCHAR(20),
    color               VARCHAR(50),
    color_hex           CHAR(7),
    sku                 VARCHAR(100)  UNIQUE,
    rent_price_per_day  NUMERIC(10,2),
    sale_price          NUMERIC(10,2),
    stock_qty           INT           NOT NULL DEFAULT 0,
    available_qty       INT           NOT NULL DEFAULT 0,
    weight_grams        INT,
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rent_price  CHECK (rent_price_per_day IS NULL OR rent_price_per_day >= 0),
    CONSTRAINT chk_sale_price  CHECK (sale_price IS NULL OR sale_price >= 0),
    CONSTRAINT chk_stock       CHECK (stock_qty >= 0),
    CONSTRAINT chk_available   CHECK (available_qty >= 0 AND available_qty <= stock_qty)
);

CREATE TABLE product_images (
    id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID     NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id  UUID     REFERENCES product_variants(id) ON DELETE SET NULL,
    url         TEXT     NOT NULL,
    alt_text    VARCHAR(200),
    is_primary  BOOLEAN  NOT NULL DEFAULT FALSE,
    sort_order  INT      NOT NULL DEFAULT 0
);

-- Section 5: Cart
CREATE TABLE cart_items (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    variant_id      UUID        NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    item_type       item_type   NOT NULL,
    quantity        INT         NOT NULL DEFAULT 1,
    rental_start    DATE,
    rental_end      DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cart_qty   CHECK (quantity > 0),
    CONSTRAINT chk_cart_dates CHECK (
        (item_type = 'sale') OR
        (item_type = 'rent' AND rental_start IS NOT NULL AND rental_end IS NOT NULL AND rental_end > rental_start)
    ),
    UNIQUE (user_id, variant_id, item_type, rental_start, rental_end)
);

-- Section 6: Coupons
CREATE TABLE coupons (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    code              VARCHAR(30)   NOT NULL UNIQUE,
    description       TEXT,
    discount_type     discount_type NOT NULL,
    discount_value    NUMERIC(10,2) NOT NULL,
    min_order_value   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    max_discount_cap  NUMERIC(12,2),
    usage_limit       INT,
    used_count        INT           NOT NULL DEFAULT 0,
    per_user_limit    INT           NOT NULL DEFAULT 1,
    applies_to        coupon_scope  NOT NULL DEFAULT 'all',
    valid_from        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    valid_until       TIMESTAMPTZ,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE coupon_usages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id   UUID        NOT NULL REFERENCES coupons(id),
    user_id     UUID        NOT NULL REFERENCES users(id),
    order_id    UUID,
    used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Section 7: Orders
CREATE TABLE orders (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID          NOT NULL REFERENCES users(id),
    address_id       UUID          NOT NULL REFERENCES addresses(id),
    coupon_id        UUID          REFERENCES coupons(id),
    order_number     VARCHAR(30)   NOT NULL UNIQUE,
    status           order_status  NOT NULL DEFAULT 'pending_payment',
    type             order_type    NOT NULL,
    subtotal         NUMERIC(12,2) NOT NULL,
    discount_amount  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    delivery_charge  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    deposit_total    NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount       NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount     NUMERIC(12,2) NOT NULL,
    currency         CHAR(3)       NOT NULL DEFAULT 'INR',
    delivery_address JSONB         NOT NULL,
    notes            TEXT,
    cancelled_at     TIMESTAMPTZ,
    cancel_reason    TEXT,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID           NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    variant_id       UUID           NOT NULL REFERENCES product_variants(id),
    vendor_id        UUID           NOT NULL REFERENCES vendors(id),
    item_type        item_type      NOT NULL,
    quantity         INT            NOT NULL,
    unit_price       NUMERIC(10,2)  NOT NULL,
    rental_days      INT,
    rental_start     DATE,
    rental_end       DATE,
    deposit_amount   NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
    deposit_status   deposit_status NOT NULL DEFAULT 'not_applicable',
    line_total       NUMERIC(12,2)  NOT NULL,
    product_snapshot JSONB          NOT NULL,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Section 8: Rentals
CREATE TABLE rentals (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id        UUID           NOT NULL UNIQUE REFERENCES order_items(id),
    status               rental_status  NOT NULL DEFAULT 'scheduled',
    actual_pickup_date   DATE,
    actual_return_date   DATE,
    expected_return_date DATE           NOT NULL,
    condition_on_pickup  TEXT,
    condition_on_return  TEXT,
    pickup_confirmed_at  TIMESTAMPTZ,
    return_confirmed_at  TIMESTAMPTZ,
    extension_days       INT            NOT NULL DEFAULT 0,
    late_fee             NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
    damage_fee           NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
    notes                TEXT,
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Section 9: Payments
CREATE TABLE payments (
    id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID             NOT NULL REFERENCES orders(id),
    gateway             payment_gateway  NOT NULL,
    gateway_order_id    VARCHAR(200),
    gateway_payment_id  VARCHAR(200),
    gateway_signature   TEXT,
    amount              NUMERIC(12,2)    NOT NULL,
    status              payment_status   NOT NULL DEFAULT 'initiated',
    payment_type        payment_type     NOT NULL DEFAULT 'charge',
    parent_payment_id   UUID             REFERENCES payments(id),
    failure_reason      TEXT,
    paid_at             TIMESTAMPTZ,
    metadata            JSONB,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- Section 10: Reviews
CREATE TABLE reviews (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id),
    product_id    UUID        NOT NULL REFERENCES products(id),
    order_item_id UUID        NOT NULL UNIQUE REFERENCES order_items(id),
    rating        SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title         VARCHAR(150),
    comment       TEXT,
    images        TEXT[]      DEFAULT '{}',
    is_visible    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, order_item_id)
);

-- Section 11: Wishlists
CREATE TABLE wishlists (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

-- Section 12: Notifications
CREATE TABLE notifications (
    id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        notification_type NOT NULL,
    title       VARCHAR(200)      NOT NULL,
    body        TEXT              NOT NULL,
    payload     JSONB,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- Section 13: Vendor Payouts
CREATE TABLE payouts (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID          NOT NULL REFERENCES vendors(id),
    bank_account_id UUID          NOT NULL REFERENCES vendor_bank_accounts(id),
    amount          NUMERIC(12,2) NOT NULL,
    platform_fee    NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_amount      NUMERIC(12,2) NOT NULL,
    status          VARCHAR(30)   NOT NULL DEFAULT 'pending',
    gateway_ref     VARCHAR(200),
    period_from     DATE,
    period_to       DATE,
    settled_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE payout_items (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id     UUID          NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    order_item_id UUID          NOT NULL REFERENCES order_items(id),
    amount        NUMERIC(12,2) NOT NULL
);

-- Triggers

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_users_updated_at          BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vendors_updated_at        BEFORE UPDATE ON vendors         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_addresses_updated_at      BEFORE UPDATE ON addresses       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at       BEFORE UPDATE ON products        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_variants_updated_at       BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated_at         BEFORE UPDATE ON orders          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rentals_updated_at        BEFORE UPDATE ON rentals         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at       BEFORE UPDATE ON payments        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reviews_updated_at        BEFORE UPDATE ON reviews         FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE SEQUENCE order_seq START 1000;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.order_number := 'VST-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_seq')::TEXT, 6, '0');
    RETURN NEW;
END; $$;

CREATE TRIGGER trg_orders_order_number BEFORE INSERT ON orders
    FOR EACH ROW WHEN (NEW.order_number IS NULL) EXECUTE FUNCTION generate_order_number();

CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'D');
    RETURN NEW;
END; $$;

CREATE TRIGGER trg_products_search_vector BEFORE INSERT OR UPDATE OF name, brand, description, tags
    ON products FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

CREATE OR REPLACE FUNCTION refresh_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE pid UUID := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
    UPDATE products SET
        rating_avg   = COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = pid AND is_visible), 0),
        review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = pid AND is_visible)
    WHERE id = pid;
    RETURN NULL;
END; $$;

CREATE TRIGGER trg_reviews_product_rating AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();

CREATE OR REPLACE FUNCTION check_variant_availability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.available_qty < 0 THEN
        RAISE EXCEPTION 'Variant % is out of stock', NEW.id;
    END IF;
    RETURN NEW;
END; $$;

CREATE TRIGGER trg_variant_qty_check BEFORE UPDATE OF available_qty ON product_variants
    FOR EACH ROW EXECUTE FUNCTION check_variant_availability();

-- Views

CREATE OR REPLACE VIEW v_product_listings AS
SELECT
    p.id, p.name, p.slug, p.listing_type, p.deposit_amount,
    p.rating_avg, p.review_count, p.tags,
    c.name AS category_name, c.slug AS category_slug,
    v.shop_name AS vendor_name, v.slug AS vendor_slug,
    MIN(pv.rent_price_per_day) AS min_rent_price,
    MIN(pv.sale_price)         AS min_sale_price,
    (SELECT url FROM product_images pi2 WHERE pi2.product_id = p.id AND pi2.is_primary LIMIT 1) AS primary_image
FROM products p
JOIN categories c  ON c.id = p.category_id
JOIN vendors    v  ON v.id = p.vendor_id
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active
WHERE p.is_active AND v.status = 'active'
GROUP BY p.id, c.name, c.slug, v.shop_name, v.slug;

CREATE OR REPLACE VIEW v_order_summary AS
SELECT
    o.id, o.order_number, o.status, o.type, o.total_amount, o.created_at,
    u.full_name, u.email,
    pay.status AS payment_status,
    COUNT(oi.id) AS item_count
FROM orders o
JOIN users u ON u.id = o.user_id
LEFT JOIN payments pay ON pay.order_id = o.id AND pay.payment_type = 'charge'
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, u.full_name, u.email, pay.status;

-- Indexes

CREATE INDEX idx_products_search      ON products USING GIN(search_vector);
CREATE INDEX idx_products_tags        ON products USING GIN(tags);
CREATE INDEX idx_products_vendor      ON products(vendor_id);
CREATE INDEX idx_products_category    ON products(category_id);
CREATE INDEX idx_products_active      ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_variants_product     ON product_variants(product_id);
CREATE INDEX idx_cart_user            ON cart_items(user_id);
CREATE INDEX idx_orders_user          ON orders(user_id);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_order_items_order    ON order_items(order_id);
CREATE INDEX idx_order_items_vendor   ON order_items(vendor_id);
CREATE INDEX idx_rentals_status       ON rentals(status);
CREATE INDEX idx_rentals_return_date  ON rentals(expected_return_date) WHERE status = 'active';
CREATE INDEX idx_payments_order       ON payments(order_id);
CREATE INDEX idx_notifications_user   ON notifications(user_id, read_at);
CREATE INDEX idx_wishlists_user       ON wishlists(user_id);
CREATE INDEX idx_refresh_tokens_user  ON refresh_tokens(user_id);
