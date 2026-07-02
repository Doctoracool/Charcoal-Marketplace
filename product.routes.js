const router = require("express").Router();
const db = require("../config/db");
const multer = require("multer");
const { verifyToken, verifyAdmin } = require("../middleware/auth.middleware");

/* =========================
   MULTER CONFIG (FIXED)
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only images allowed"), false);
    }

    cb(null, true);
  }
});

/* =========================
   CREATE PRODUCT
========================= */
router.post("/", verifyToken, upload.single("image"), (req, res) => {
  const user = req.user;
  const { name, price_pi, location, stock } = req.body;

  if (!["admin", "vendor"].includes(user.role)) {
    return res.status(403).json({ message: "Not allowed" });
  }

  if (!name || !price_pi || !location || !stock || !req.file) {
    return res.status(400).json({ message: "All fields required" });
  }

  const image = `/uploads/${req.file.filename}`;
  const status = user.role === "admin" ? "approved" : "pending";

  db.query(
    `INSERT INTO products 
    (vendor_id, name, price_pi, location, stock, image, status, added_by)
    VALUES (?,?,?,?,?,?,?,?)`,
    [
      user.id,
      name,
      price_pi,
      location,
      stock,
      image,
      status,
      user.role
    ],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      res.json({
        success: true,
        message: status === "approved"
          ? "Product published"
          : "Waiting for admin approval"
      });
    }
  );
});

/* =========================
   PUBLIC PRODUCTS
========================= */
router.get("/", (req, res) => {
  db.query(
    "SELECT * FROM products WHERE status='approved' ORDER BY id DESC",
    (err, result) => {
      if (err) return res.status(500).json(err);

      // FIX IMAGE URL FOR FRONTEND
      const base = process.env.BASE_URL || "";

      const data = result.map(p => ({
        ...p,
        image: base + p.image
      }));

      res.json(data);
    }
  );
});

/* =========================
   ADMIN APPROVAL
========================= */
router.post("/admin/approve/:id", verifyAdmin, (req, res) => {
  db.query(
    "UPDATE products SET status='approved' WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

router.post("/admin/reject/:id", verifyAdmin, (req, res) => {
  db.query(
    "UPDATE products SET status='rejected' WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

/* =========================
   ADMIN PENDING PRODUCTS
========================= */
router.get("/admin/pending", verifyAdmin, (req, res) => {
  db.query(
    "SELECT * FROM products WHERE status='pending'",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

module.exports = router;