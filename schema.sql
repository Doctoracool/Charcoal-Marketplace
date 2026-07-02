CREATE DATABASE IF NOT EXISTS charcoal_marketplace;
USE charcoal_marketplace;

/* =========================
   USERS
========================= */
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  role ENUM('buyer','vendor','admin') DEFAULT 'buyer',
  status ENUM('pending','approved','rejected') DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* =========================
   PRODUCTS
========================= */
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT,
  name VARCHAR(100),
  price_pi DECIMAL(10,2),
  location VARCHAR(100),
  stock INT DEFAULT 0,
  image VARCHAR(255),
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  added_by ENUM('vendor','admin') DEFAULT 'vendor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (vendor_id) REFERENCES users(id)
);

/* =========================
   ORDERS (FIXED FOR CHECKOUT)
========================= */
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT,
  product_id INT,
  quantity INT DEFAULT 1,
  total_pi DECIMAL(10,2),
  status ENUM('pending','paid','shipped','completed','cancelled') DEFAULT 'pending',
  payment_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

/* =========================
   PAYMENTS
========================= */
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  payment_id VARCHAR(100) UNIQUE,
  txid VARCHAR(100),
  amount_pi DECIMAL(10,2),
  status ENUM('pending','approved','completed','failed') DEFAULT 'pending',
  raw_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (order_id) REFERENCES orders(id)
);

/* =========================
   PAYMENT LOGS (PI SECURITY LAYER)
========================= */
CREATE TABLE payment_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id VARCHAR(100),
  user_id INT,
  amount_pi DECIMAL(10,2),
  status ENUM('created','approved','completed','failed'),
  txid VARCHAR(100),
  raw_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* =========================
   CART
========================= */
CREATE TABLE cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  product_id INT,
  quantity INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

/* =========================
   EARNINGS (VENDOR WALLET)
========================= */
CREATE TABLE earnings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT,
  order_id INT,
  amount_pi DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  status ENUM('pending','paid') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (vendor_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

/* =========================
   NOTIFICATIONS
========================= */
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  message TEXT,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* =========================
   SAMPLE ADMIN
========================= */
INSERT INTO users (name, email, password, role, status)
VALUES (
  'Admin',
  'admin@charcoal.com',
  '$2a$10$hashedpasswordhere',
  'admin',
  'approved'
);