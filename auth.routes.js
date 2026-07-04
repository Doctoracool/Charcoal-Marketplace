const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const db = require("../config/db");

const SECRET = process.env.JWT_SECRET || "DEV_SECRET_CHANGE_ME";

/* =========================
   TOKEN GENERATOR
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
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields required"
    });
  }

  db.query(
    "SELECT id FROM users WHERE email=?",
    [email],
    async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: "DB error"
        });
      }

      if (result.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email already exists"
        });
      }

      try {
        const hashed = await bcrypt.hash(password, 10);

        db.query(
          "INSERT INTO users (name, email, password, role, status) VALUES (?,?,?,?,?)",
          [name, email, hashed, "vendor", "pending"],
          (err2) => {
            if (err2) {
              console.error(err2);
              return res.status(500).json({
                success: false,
                message: "Register failed"
              });
            }

            return res.json({
              success: true,
              message: "Vendor submitted for approval"
            });
          }
        );
      } catch (e) {
        return res.status(500).json({
          success: false,
          message: "Encryption error"
        });
      }
    }
  );
});

/* =========================
   EMAIL LOGIN
========================= */
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing fields"
    });
  }

  db.query(
    "SELECT * FROM users WHERE email=?",
    [email],
    async (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "DB error"
        });
      }

      if (!result.length) {
        return res.status(401).json({
          success: false,
          message: "User not found"
        });
      }

      const user = result[0];

      if (user.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Account not approved"
        });
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(401).json({
          success: false,
          message: "Wrong password"
        });
      }

      const token = createToken(user);

      return res.json({
        success: true,
        token,
        user
      });
    }
  );
});

/* =========================
   PI LOGIN (FULL SAFE VERSION)
========================= */
router.post("/pi-login", async (req, res) => {
  const { accessToken, uid, username } = req.body || {};

  if (!accessToken || !uid) {
    return res.status(400).json({
      success: false,
      message: "Missing Pi credentials"
    });
  }

  try {
    const response = await axios.get(
      "https://api.minepi.com/v2/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const piUser = response.data;

    if (!piUser?.uid) {
      return res.status(401).json({
        success: false,
        message: "Invalid Pi user"
      });
    }

    const email = `${piUser.uid}@pi.app`;

    db.query(
      "SELECT * FROM users WHERE email=?",
      [email],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "DB error"
          });
        }

        // USER EXISTS
        if (result.length > 0) {
          const user = result[0];
          const token = createToken(user);

          return res.json({
            success: true,
            token,
            user
          });
        }

        // CREATE NEW USER
        const hashed = bcrypt.hashSync("PI_USER", 10);

        db.query(
          "INSERT INTO users (name, email, password, role, status) VALUES (?,?,?,?,?)",
          [
            piUser.username || username || "Pi User",
            email,
            hashed,
            "buyer",
            "approved"
          ],
          (err2) => {
            if (err2) {
              return res.status(500).json({
                success: false,
                message: "Failed to create user"
              });
            }

            db.query(
              "SELECT * FROM users WHERE email=?",
              [email],
              (err3, rows) => {
                if (err3 || !rows.length) {
                  return res.status(500).json({
                    success: false,
                    message: "User fetch failed"
                  });
                }

                const user = rows[0];
                const token = createToken(user);

                return res.json({
                  success: true,
                  token,
                  user
                });
              }
            );
          }
        );
      }
    );

  } catch (err) {
    console.error("Pi login error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Pi authentication failed"
    });
  }
});

module.exports = router;