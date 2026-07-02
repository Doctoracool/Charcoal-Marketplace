const router = require("express").Router();
const db = require("../config/db");
const { verifyPayment } = require("../utils/piService");

/* =========================
   CREATE PAYMENT RECORD (OPTIONAL SAFETY STEP)
   - called when user initiates checkout
========================= */
router.post("/create", async (req, res) => {
  const { paymentId, userId, amount } = req.body;

  if (!paymentId || !amount) {
    return res.status(400).json({ message: "Missing payment data" });
  }

  db.query(
    `INSERT INTO payments (payment_id, user_id, amount, status)
     VALUES (?, ?, ?, 'pending')`,
    [paymentId, userId || null, amount],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      res.json({ success: true });
    }
  );
});

/* =========================
   STEP 1: PI APPROVAL (SERVER VERIFICATION)
   - Pi confirms payment exists & is valid
========================= */
router.post("/approve", async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ message: "paymentId required" });
  }

  try {
    const payment = await verifyPayment(paymentId);

    if (!payment) {
      return res.status(400).json({ message: "Invalid payment" });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({ message: "Payment not pending" });
    }

    db.query(
      "UPDATE payments SET status=?, raw_data=? WHERE payment_id=?",
      ["approved", JSON.stringify(payment), paymentId],
      (err) => {
        if (err) return res.status(500).json({ message: "DB error" });

        res.json({
          success: true,
          message: "Payment approved by Pi"
        });
      }
    );

  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   STEP 2: COMPLETE PAYMENT
   - final confirmation after Pi blockchain success
========================= */
router.post("/complete", async (req, res) => {
  const { paymentId, txid } = req.body;

  if (!paymentId || !txid) {
    return res.status(400).json({ message: "Missing paymentId or txid" });
  }

  try {
    const payment = await verifyPayment(paymentId);

    if (!payment || payment.status !== "completed") {
      return res.status(400).json({
        message: "Payment not confirmed on Pi network"
      });
    }

    db.query(
      "UPDATE payments SET status=?, txid=? WHERE payment_id=?",
      ["completed", txid, paymentId],
      (err) => {
        if (err) return res.status(500).json({ message: "DB error" });

        /* =========================
           LINK TO ORDER SYSTEM
        ========================= */
        db.query(
          "UPDATE orders SET status='paid' WHERE payment_id=?",
          [paymentId]
        );

        res.json({
          success: true,
          message: "Payment completed successfully"
        });
      }
    );

  } catch (err) {
    console.error("Complete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;