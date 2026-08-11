/* =========================================================
   CHARCOAL MARKETPLACE
   COMPLETE RAILWAY MYSQL SCHEMA
========================================================= */


/* =========================================================
   USERS
========================================================= */

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    role ENUM(
        'buyer',
        'vendor',
        'admin'
    ) NOT NULL DEFAULT 'buyer',

    status ENUM(
        'pending',
        'approved',
        'rejected'
    ) NOT NULL DEFAULT 'approved',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* =========================================================
   PRODUCTS
========================================================= */

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,

    vendor_id INT NOT NULL,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    price_pi DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    location VARCHAR(120),

    stock INT NOT NULL DEFAULT 0,

    image VARCHAR(255),

    status ENUM(
        'pending',
        'approved',
        'rejected'
    ) NOT NULL DEFAULT 'pending',

    added_by ENUM(
        'vendor',
        'admin'
    ) NOT NULL DEFAULT 'vendor',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


/* =========================================================
   ORDERS
========================================================= */

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,

    buyer_id INT NOT NULL,

    product_id INT NOT NULL,

    quantity INT NOT NULL DEFAULT 1,

    total_pi DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    payment_id VARCHAR(100),

    status ENUM(
        'pending',
        'paid',
        'shipped',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_orders_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);


/* =========================================================
   PAYMENTS
========================================================= */

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    order_id INT NOT NULL,

    payment_id VARCHAR(100) UNIQUE,

    txid VARCHAR(100),

    amount_pi DECIMAL(10,2),

    status ENUM(
        'pending',
        'approved',
        'completed',
        'failed'
    ) NOT NULL DEFAULT 'pending',

    raw_data JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
);


/* =========================================================
   PAYMENT LOGS
========================================================= */

CREATE TABLE IF NOT EXISTS payment_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,

    payment_id VARCHAR(100),

    user_id INT NULL,

    amount_pi DECIMAL(10,2),

    status ENUM(
        'created',
        'approved',
        'completed',
        'failed'
    ),

    txid VARCHAR(100),

    raw_data JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_paymentlogs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


/* =========================================================
   CART
========================================================= */

CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    product_id INT NOT NULL,

    quantity INT NOT NULL DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cart_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);


/* =========================================================
   EARNINGS
========================================================= */

CREATE TABLE IF NOT EXISTS earnings (
    id INT AUTO_INCREMENT PRIMARY KEY,

    vendor_id INT NOT NULL,

    order_id INT NOT NULL,

    amount_pi DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    net_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    status ENUM(
        'pending',
        'paid'
    ) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_earnings_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_earnings_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
);


/* =========================================================
   NOTIFICATIONS
========================================================= */

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    message TEXT,

    type VARCHAR(50),

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);