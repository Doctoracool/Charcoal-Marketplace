const router = require("express").Router();
const db = require("../config/db");
const verifyToken = require("../middleware/auth.middleware");

/* =========================
   CREATE ORDER (SAFE + LINKED)
========================= */
router.post("/", verifyToken, (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  const buyer_id = req.user.id;

  if (!product_id) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  db.query(
    "SELECT * FROM products WHERE id = ? AND status = 'approved'",
    [product_id],
    (err, products) => {
      if (err) return res.status(500).json(err);

      if (!products.length) {
        return res.status(404).json({ message: "Product not found" });
      }

      const product = products[0];

      if (product.stock < quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      const total = product.price_pi * quantity;

      db.query(
        `INSERT INTO orders (buyer_id, product_id, quantity, status)
         VALUES (?, ?, ?, 'pending')`,
        [buyer_id, product_id, quantity],
        (err2, result) => {
          if (err2) return res.status(500).json(err2);

          res.json({
            success: true,
            order_id: result.insertId,
            total,
            product
          });
        }
      );
    }
  );
});

/* =========================
   GET ALL ORDERS (ADMIN ONLY OPTIONAL)
========================= */
router.get("/", verifyToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only access" });
  }

  db.query(
    `SELECT orders.*, products.name, products.price_pi
     FROM orders
     JOIN products ON orders.product_id = products.id
     ORDER BY orders.id DESC`,
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

/* =========================
   GET USER ORDERS
========================= */
router.get("/my", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    `SELECT orders.*, products.name, products.price_pi, products.image
     FROM orders
     JOIN products ON orders.product_id = products.id
     WHERE orders.buyer_id = ?
     ORDER BY orders.id DESC`,
    [userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

/* =========================
   UPDATE ORDER STATUS (SECURE)
========================= */
router.put("/:id/status", verifyToken, (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  const userId = req.user.id;

  const allowed = ["pending", "paid", "completed", "cancelled"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  db.query(
    "SELECT * FROM orders WHERE id = ?",
    [orderId],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (!result.length) {
        return res.status(404).json({ message: "Order not found" });
      }

      const order = result[0];

      // only owner or admin can update
      if (order.buyer_id !== userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not allowed" });
      }

      db.query(
        "UPDATE orders SET status = ? WHERE id = ?",
        [status, orderId],
        (err2) => {
          if (err2) return res.status(500).json(err2);

          res.json({
            success: true,
            message: "Order updated successfully"
          });
        }
      );
    }
  );
});

/* =========================
   DELETE ORDER (ADMIN ONLY)
========================= */
router.delete("/:id", verifyToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const orderId = req.params.id;

  db.query(
    "DELETE FROM orders WHERE id = ?",
    [orderId],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({
        success: true,
        message: "Order deleted"
      });
    }
  );
});

module.exports = router;