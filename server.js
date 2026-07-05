console.log("🚀 SERVER STARTING...");

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

/* =========================
   APP INIT
========================= */
const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   TRUST PROXY (RENDER FIX)
========================= */
app.set("trust proxy", 1);

/* =========================
   CORS CONFIG (PI + WEB SAFE)
========================= */
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5000"
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

/* =========================
   BODY PARSER
========================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Charcoal Marketplace API running 🚀"
  });
});

/* =========================
   ROUTES (FIXED - NO SAFE ROUTE)
========================= */
try {
  app.use("/api/auth", require(auth.routes.js));
  console.log("✅ Auth routes loaded");
} catch (err) {
  console.error("❌ Auth routes failed:", err.message);
}

try {
  app.use("/api/products", require(product.routes.js));
  console.log("✅ Product routes loaded");
} catch (err) {
  console.error("❌ Product routes failed:", err.message);
}

try {
  app.use("/api/orders", require(order.routes.js));
  console.log("✅ Order routes loaded");
} catch (err) {
  console.error("❌ Order routes failed:", err.message);
}

try {
  app.use("/api/payments", require(payment.routes.js));
  console.log("✅ Payment routes loaded");
} catch (err) {
  console.error("❌ Payment routes failed:", err.message);
}

try {
  app.use("/api/admin", require(admin.routes.js));
  console.log("✅ Admin routes loaded");
} catch (err) {
  console.error("❌ Admin routes failed:", err.message);
}

try {
  app.use("/api/notifications", require(notification.routes.js));
  console.log("✅ Notification routes loaded");
} catch (err) {
  console.error("❌ Notification routes failed:", err.message);
}

/* =========================
   STATIC FILES
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API READY: https://charcoal-marketplace-1.onrender.com`);
});