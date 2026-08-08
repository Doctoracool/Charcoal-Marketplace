const mysql = require("mysql2");
require("dotenv").config();

/* =========================
   ENV VALIDATION
========================= */

console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_PORT =", process.env.DB_PORT);
console.log("DB_USER =", process.env.DB_USER);
console.log("DB_NAME =", process.env.DB_NAME);

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
});

/* =========================
   MYSQL CONNECTION POOL
========================= */

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* =========================
   TEST CONNECTION
========================= */

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL Connection Error:");
    console.error(err.message);
    process.exit(1);
  }

  console.log("✅ MySQL Connected Successfully");
  connection.release();
});

module.exports = db;
