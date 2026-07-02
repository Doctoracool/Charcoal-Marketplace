const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const db = require("../config/db");

const SECRET = process.env.JWT_SECRET || "DEV_SECRET_CHANGE_ME";

/* =========================
   CREATE TOKEN
========================= */
function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    SECRET,
    { expiresIn: "1d" }
  );
}

/* =========================
   REGISTER VENDOR
========================= */
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  db.query("SELECT id FROM users WHERE email=?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (result.length > 0) {
      return res.status(409).json({ message: "Email exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (name, email, password, role, status) VALUES (?,?,?,?,?)",
      [name, email, hashed, "vendor", "pending"],
      (err2) => {
        if (err2) return res.status(500).json({ message: "Register failed" });

        res.json({
          success: true,
          message: "Vendor submitted for approval"
        });
      }
    );
  });
});

/* =========================
   LOGIN (EMAIL)
========================= */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  db.query("SELECT * FROM users WHERE email=?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (result.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = result[0];

    if (user.status !== "approved") {
      return res.status(403).json({ message: "Account not approved" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = createToken(user);

    res.json({
      success: true,
      token,
      user
    });
  });
});

/* =========================
   PI LOGIN (FIXED + SAFE)
========================= */
router.post("/pi-login", async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ message: "Missing access token" });
  }

  try {
    const response = await axios.get("https://api.minepi.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const piUser = response.data;

    if (!piUser || !piUser.uid) {
      return res.status(401).json({ message: "Invalid Pi user" });
    }

    const email = `${piUser.uid}@pi.app`;

    db.query("SELECT * FROM users WHERE email=?", [email], (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });

      let user = result[0];

      if (!user) {
        const hashed = bcrypt.hashSync("PI_USER", 10);

        db.query(
          "INSERT INTO users (name, email, password, role, status) VALUES (?,?,?,?,?)",
          [
            piUser.username || "Pi User",
            email,
            hashed,
            "buyer",
            "approved"
          ],
          () => {
            db.query("SELECT * FROM users WHERE email=?", [email], (err2, r2) => {
              user = r2[0];

              const token = createToken(user);

              return res.json({
                success: true,
                token,
                user
              });
            });
          }
        );

        return;
      }

      const token = createToken(user);

      return res.json({
        success: true,
        token,
        user
      });
    });

  } catch (err) {
    console.error("Pi login error:", err.message);
    return res.status(500).json({ message: "Pi authentication failed" });
  }
});

module.exports = router;