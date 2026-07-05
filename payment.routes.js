const router = require("express").Router();
const db = require("../config/db");

// SAFE IMPORT (prevents crash if missing)
let verifyPayment;

try {
  ({ verifyPayment } = require("../utils/piService"));
} catch (err) {
  console.warn("⚠️ Pi service missing - fallback active");

  verifyPayment = async () => null;
}

/* =========================
   CREATE PAYMENT RECORD
========================= */
router.post("/create", (req, res) => {
  const { paymentId, userId, amount } = req.body || {};

  if (!paymentId || !amount) {
    return res.status(400).json({
      success: false,
      message: "Missing payment data"
    });
  }

  db.query(
    "INSERT INTO payments (payment_id, user_id, amount, status) VALUES (?, ?, ?, 'pending')",
    [paymentId, userId || null, amount],
    (err) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({
          success: false,
          message: "DB error"
        });
      }

      res.json({ success: true });
    }
  );
});

/* =========================
   APPROVE PAYMENT (PI SAFE)
========================= */
router.post("/approve", async (req, res) => {
  const { paymentId } = req.body || {};

  if (!paymentId) {
    return res.status(400).json({
      success: false,
      message: "paymentId required"
    });
  }

  try {
    const payment = await verifyPayment(paymentId);

    if (!payment) {
      return res.status(400).json({
        success: false,
        message: "Invalid Pi payment"
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Payment not pending"
      });
    }

    db.query(
      "UPDATE payments SET status=?, raw_data=? WHERE payment_id=?",
      ["approved", JSON.stringify(payment), paymentId],
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "DB error"
          });
        }

        res.json({
          success: true,
          message: "Payment approved"
        });
      }
    );

  } catch (err) {
    console.error("Approve error:", err.message);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* =========================
   COMPLETE PAYMENT (FINAL STEP)
========================= */
router.post("/complete", async (req, res) => {
  const { paymentId, txid } = req.body || {};

  if (!paymentId || !txid) {
    return res.status(400).json({
      success: false,
      message: "Missing paymentId or txid"
    });
  }

  try {
    const payment = await verifyPayment(paymentId);

    if (!payment || payment.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment not confirmed on Pi"
      });
    }

    // prevent duplicate completion
    db.query(
      "SELECT status FROM payments WHERE payment_id=?",
      [paymentId],
      (err, rows) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "DB error"
          });
        }

        if (rows.length && rows[0].status === "completed") {
          return res.json({
            success: true,
            message: "Already completed"
          });
        }

        db.query(
          "UPDATE payments SET status=?, txid=? WHERE payment_id=?",
          ["completed", txid, paymentId],
          (err2) => {
            if (err2) {
              return res.status(500).json({
                success: false,
                message: "DB error"
              });
            }

            // SAFE ORDER UPDATE (non-blocking)
            db.query(
              "UPDATE orders SET status='paid' WHERE payment_id=?",
              [paymentId],
              (err3) => {
                if (err3) {
                  console.error("Order update error:", err3.message);
                }
              }
            );

            return res.json({
              success: true,
              message: "Payment completed successfully"
            });
          }
        );
      }
    );

  } catch (err) {
    console.error("Complete error:", err.message);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

module.exports = router;