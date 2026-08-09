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

/* ==============
   PI LOGIN 
=============== */
router.post("/pi-login", async (req, res) => {
  const { accessToken, uid, username } = req.body || {};

  if (!accessToken || !uid) {
    return res.status(400).json({
      success: false,
      message: "Missing Pi credentials"
    });
  }

  try {
    // SAFE PI API CALL WITH TIMEOUT
    const response = await axios.get("https://api.minepi.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 8000
    });

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

    /* =========================================================
   ADMIN EMAIL LOGIN
========================================================= */

router.post(
  "/admin-login",
  (req, res) => {

    const {
      email,
      password
    } = req.body || {};


    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }


    db.query(
      `
      SELECT *
      FROM users
      WHERE email = ?
      AND role = 'admin'
      LIMIT 1
      `,
      [email],
      async (err, result) => {

        if (err) {

          console.error(
            "Admin login DB error:",
            err
          );

          return res.status(500).json({
            success: false,
            message: "Database error"
          });

        }


        if (!result.length) {

          return res.status(401).json({
            success: false,
            message: "Invalid admin credentials"
          });

        }


        const user =
          result[0];


        if (user.role !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Admin access denied"
          });
        }


        if (user.status !== "approved") {
          return res.status(403).json({
            success: false,
            message: "Admin account is not approved"
          });
        }


        const passwordMatch =
          await bcrypt.compare(
            password,
            user.password
          );


        if (!passwordMatch) {
          return res.status(401).json({
            success: false,
            message: "Invalid admin credentials"
          });
        }


        const token =
          createToken(user);


        return res.json({
          success: true,
          token,

          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
          }
        });

      }
    );

  }
);

    /* =========================================================
   PI ADMIN LOGIN
========================================================= */

router.post(
  "/pi-admin-login",
  async (req, res) => {

    const {
      accessToken,
      uid
    } = req.body || {};


    if (!accessToken || !uid) {

      return res.status(400).json({
        success: false,
        message: "Missing Pi credentials"
      });

    }


    try {

      const response =
        await axios.get(
          "https://api.minepi.com/v2/me",
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`
            },

            timeout: 8000
          }
        );


      const piUser =
        response.data;


      if (
        !piUser ||
        !piUser.uid
      ) {

        return res.status(401).json({
          success: false,
          message: "Invalid Pi account"
        });

      }


      /*
        IMPORTANT:
        The Pi UID is used to locate
        an EXISTING account.

        We DO NOT automatically create
        an administrator.
      */

      const email =
        `${piUser.uid}@pi.app`;


      db.query(
        `
        SELECT *
        FROM users
        WHERE email = ?
        AND role = 'admin'
        LIMIT 1
        `,
        [email],
        (err, result) => {

          if (err) {

            console.error(
              "Pi admin DB error:",
              err
            );

            return res.status(500).json({
              success: false,
              message: "Database error"
            });

          }


          if (!result.length) {

            return res.status(403).json({
              success: false,
              message:
                "This Pi account is not registered as an administrator."
            });

          }


          const user =
            result[0];


          if (
            user.role !== "admin"
          ) {

            return res.status(403).json({
              success: false,
              message: "Admin access denied"
            });

          }


          if (
            user.status !== "approved"
          ) {

            return res.status(403).json({
              success: false,
              message:
                "Administrator account is not approved."
            });

          }


          const token =
            createToken(user);


          return res.json({

            success: true,

            token,

            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status
            }

          });

        }
      );


    } catch (error) {

      console.error(
        "Pi admin verification error:",
        error.message
      );


      return res.status(401).json({
        success: false,
        message:
          "Pi account verification failed"
      });

    }

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