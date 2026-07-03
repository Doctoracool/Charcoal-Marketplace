const mysql = require("mysql2");
require("dotenv").config();

/* =========================
   ENV VALIDATION (CRITICAL FIX)
========================= */
const requiredEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1); // prevents silent crash later
  }
});

/* =========================
   DATABASE POOL
========================= */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* =========================
   PROMISE VERSION
========================= */
const db = pool.promise();

/* =========================
   SAFE CONNECTION TEST
========================= */
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:");
    console.error(err.message);
    process.exit(1); // IMPORTANT: stop app cleanly
  }

  console.log("✅ MySQL connected successfully");
  connection.release();
});

module.exports = db;