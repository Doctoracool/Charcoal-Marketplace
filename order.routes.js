const router = require("express").Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth.middleware");

/* =========================
   CREATE ORDER (SAFE + FIXED)
========================= */
router.post("/", verifyToken, (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  const buyer_id = req.user?.id;

  if (!buyer_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  if (!product_id) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required"
    });
  }

  db.query(
    "SELECT * FROM products WHERE id = ? AND status = 'approved'",
    [product_id],
    (err, products) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "DB error"
        });
      }

      if (!products || !products.length) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const product = products[0];

      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock"
        });
      }

      const total = product.price_pi * quantity;

      db.query(
        `INSERT INTO orders (buyer_id, product_id, quantity, status)
         VALUES (?, ?, ?, 'pending')`,
        [buyer_id, product_id, quantity],
        (err2, result) => {
          if (err2) {
            return res.status(500).json({
              success: false,
              message: "Failed to create order"
            });
          }

          return res.json({
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
   GET ALL ORDERS (ADMIN ONLY)
========================= */
router.get("/", verifyToken, (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin only access"
    });
  }

  db.query(
    `SELECT orders.*, products.name, products.price_pi
     FROM orders
     JOIN products ON orders.product_id = products.id
     ORDER BY orders.id DESC`,
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "DB error"
        });
      }

      res.json(result || []);
    }
  );
});

/* =========================
   GET USER ORDERS (SAFE)
========================= */
router.get("/my", verifyToken, (req, res) => {
  const userId = req.user?.id;

  db.query(
    `SELECT orders.*, products.name, products.price_pi, products.image
     FROM orders
     JOIN products ON orders.product_id = products.id
     WHERE orders.buyer_id = ?
     ORDER BY orders.id DESC`,
    [userId],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "DB error"
        });
      }

      res.json(result || []);
    }
  );
});

/* =========================
   UPDATE ORDER STATUS (SAFE)
========================= */
router.put("/:id/status", verifyToken, (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  const userId = req.user?.id;

  const allowed = ["pending", "paid", "completed", "cancelled"];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status"
    });
  }

  db.query(
    "SELECT * FROM orders WHERE id = ?",
    [orderId],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "DB error"
        });
      }

      if (!result || !result.length) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      const order = result[0];

      if (order.buyer_id !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Not allowed"
        });
      }

      db.query(
        "UPDATE orders SET status = ? WHERE id = ?",
        [status, orderId],
        (err2) => {
          if (err2) {
            return res.status(500).json({
              success: false,
              message: "DB error"
            });
          }

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
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin only"
    });
  }

  const orderId = req.params.id;

  db.query(
    "DELETE FROM orders WHERE id = ?",
    [orderId],
    (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "DB error"
        });
      }

      res.json({
        success: true,
        message: "Order deleted"
      });
    }
  );
});

module.exports = router;