const router = require("express").Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth.middleware");

/* =========================
   ADMIN MIDDLEWARE (SAFE)
========================= */
function verifyAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only access" });
    }

    next();
  });
}

/* =========================
   PENDING PRODUCTS
========================= */
router.get("/products/pending", verifyAdmin, (req, res) => {
  db.query(
    "SELECT * FROM products WHERE status='pending'",
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(result);
    }
  );
});

/* =========================
   PENDING VENDORS
========================= */
router.get("/vendors/pending", verifyAdmin, (req, res) => {
  db.query(
    "SELECT * FROM users WHERE role='vendor' AND status='pending'",
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(result);
    }
  );
});

/* =========================
   APPROVE PRODUCT (FIXED FLOW)
========================= */
router.post("/products/approve/:id", verifyAdmin, (req, res) => {
  const id = req.params.id;

  db.query(
    "UPDATE products SET status='approved' WHERE id=?",
    [id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      db.query(
        "SELECT vendor_id FROM products WHERE id=?",
        [id],
        (err2, result) => {
          if (!err2 && result.length > 0) {
            db.query(
              "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
              [
                result[0].vendor_id,
                "Your product is now approved and live ✅",
                "product"
              ]
            );
          }
        }
      );

      res.json({ success: true, message: "Product approved" });
    }
  );
});

/* =========================
   REJECT PRODUCT
========================= */
router.post("/products/reject/:id", verifyAdmin, (req, res) => {
  const id = req.params.id;

  db.query(
    "UPDATE products SET status='rejected' WHERE id=?",
    [id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      db.query(
        "SELECT vendor_id FROM products WHERE id=?",
        [id],
        (err2, result) => {
          if (!err2 && result.length > 0) {
            db.query(
              "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
              [
                result[0].vendor_id,
                "Your product was rejected ❌",
                "product"
              ]
            );
          }
        }
      );

      res.json({ success: true, message: "Product rejected" });
    }
  );
});

/* =========================
   APPROVE VENDOR
========================= */
router.post("/vendors/approve/:id", verifyAdmin, (req, res) => {
  const id = req.params.id;

  db.query(
    "UPDATE users SET status='approved' WHERE id=? AND role='vendor'",
    [id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      db.query(
        "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
        [
          id,
          "Your vendor account is approved 🎉",
          "vendor"
        ]
      );

      res.json({ success: true });
    }
  );
});

/* =========================
   REJECT VENDOR
========================= */
router.post("/vendors/reject/:id", verifyAdmin, (req, res) => {
  const id = req.params.id;

  db.query(
    "UPDATE users SET status='rejected' WHERE id=? AND role='vendor'",
    [id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      db.query(
        "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
        [
          id,
          "Your vendor application was rejected ❌",
          "vendor"
        ]
      );

      res.json({ success: true });
    }
  );
});

module.exports = router;