const router = require("express").Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/authMiddleware");

/* =========================
   GET USER NOTIFICATIONS
========================= */
router.get("/", verifyToken(), (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });

      res.json(result);
    }
  );
});

/* =========================
   MARK SINGLE NOTIFICATION AS READ (SECURE)
========================= */
router.post("/read/:id", verifyToken(), (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  db.query(
    "UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?",
    [notificationId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });

      if (result.affectedRows === 0) {
        return res.status(403).json({ message: "Not allowed" });
      }

      res.json({ success: true });
    }
  );
});

module.exports = router;