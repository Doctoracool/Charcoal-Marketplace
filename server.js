console.log("SERVER STARTING...");

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
   TRUST PROXY (Render FIX)
========================= */
app.set("trust proxy", 1);

/* =========================
   CORS (PI SAFE + PRODUCTION SAFE)
========================= */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow mobile apps / Pi browser
    if (!origin) return callback(null, true);

    // allow local dev only strictly listed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // production fallback (safe for Pi Browser + hosted frontend)
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
   ROUTES SAFETY WRAPPER
========================= */
function safeRoute(routePath, routeFile) {
  try {
    app.use(routePath, require(routeFile));
    console.log(`✅ Loaded ${routePath}`);
  } catch (err) {
    console.error(`❌ Failed loading ${routePath}:`, err.message);
  }
}

safeRoute("/api/auth", "./routes/auth.routes");
safeRoute("/api/products", "./routes/product.routes");
safeRoute("/api/orders", "./routes/order.routes");
safeRoute("/api/payments", "./routes/payment.routes");
safeRoute("/api/admin", "./routes/admin.routes");
safeRoute("/api/notifications", "./routes/notification.routes");

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
   START SERVER (SAFE)
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}`);
});