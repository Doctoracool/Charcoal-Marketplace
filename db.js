const mysql = require("mysql2");
require("dotenv").config();

/* =========================
   DATABASE POOL
========================= */
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "charcoal_marketplace",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* =========================
   PROMISE VERSION (CORRECT)
========================= */
const db = pool.promise();

/* =========================
   TEST CONNECTION
========================= */
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    return;
  }

  console.log("✅ MySQL connected successfully");
  connection.release();
});

module.exports = {
  db,
  pool
};