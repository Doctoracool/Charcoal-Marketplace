const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

/* =========================
   PORT
========================= */
const PORT = process.env.PORT || 5000;

/* =========================
   TRUST PROXY (Render / Cloud support)
========================= */
app.set("trust proxy", 1);

/* =========================
   CORS (PI BROWSER SAFE MODE)
========================= */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow mobile / Pi Browser requests (no origin)
    if (!origin) return callback(null, true);

    // allow local dev
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // allow all for Pi Browser compatibility (important)
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

/* =========================
   BODY PARSING
========================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Charcoal Marketplace API running successfully 🚀"
  });
});

/* =========================
   ROUTES
========================= */
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/products", require("./routes/product.routes"));
app.use("/api/orders", require("./routes/order.routes"));
app.use("/api/payments", require("./routes/payment.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));

/* =========================
   STATIC FILES (UPLOADS)
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
  console.error("🔥 Server Error:", err);

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
  console.log(`📡 API Ready at http://localhost:${PORT}`);
});