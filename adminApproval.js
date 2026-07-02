const router = require("express").Router();
const db = require("../config/db");
const verifyToken = require("../middleware/auth.middleware");

/* =========================
   ADMIN GUARD (SAFE)
========================= */
function verifyAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only access" });
    }
    next();
  });
}

/* =========================
   GET PENDING VENDORS
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
   APPROVE VENDOR (SAFE UPDATE)
========================= */
router.post("/vendors/approve/:id", verifyAdmin, (req, res) => {
  const id = req.params.id;

  db.query(
    "UPDATE users SET status='approved' WHERE id=? AND role='vendor' AND status!='approved'",
    [id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      db.query(
        "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
        [id, "Your vendor account has been approved 🎉", "vendor"],
        (err2) => {
          if (err2) console.error("Notification error:", err2);
        }
      );

      res.json({ success: true, message: "Vendor approved" });
    }
  );
});

/* =========================
   GET PENDING PRODUCTS
========================= */
router.get("/products/pending", verifyAdmin, (req, res) => {
  db.query(
    "SELECT * FROM products WHERE status='pending' OR status IS NULL",
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(result);
    }
  );
});

/* =========================
   APPROVE PRODUCT (SAFE)
========================= */
router.post("/products/approve/:id", verifyAdmin, (req, res) => {
  const id = req.params.id;

  db.query(
    "UPDATE products SET status='approved' WHERE id=? AND status!='approved'",
    [id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      db.query(
        "SELECT vendor_id FROM products WHERE id=?",
        [id],
        (err2, result) => {
          if (err2) return;

          if (result.length > 0) {
            const vendorId = result[0].vendor_id;

            db.query(
              "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
              [
                vendorId,
                "Your product was approved and is now live ✅",
                "product"
              ],
              (err3) => {
                if (err3) console.error("Notification error:", err3);
              }
            );
          }
        }
      );

      res.json({ success: true, message: "Product approved" });
    }
  );
});

module.exports = router;