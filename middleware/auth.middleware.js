const jwt = require("jsonwebtoken");
const db = require("../config/db");

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  console.error("❌ JWT_SECRET is missing from environment variables");
}

/* =========================================================
   VERIFY JWT + CURRENT USER STATUS
========================================================= */

function verifyToken(allowedRoles = null) {

  return (req, res, next) => {

    try {

      const authHeader = req.headers.authorization;

      if (
        !authHeader ||
        !authHeader.startsWith("Bearer ")
      ) {

        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });

      }

      const token =
        authHeader.substring(7).trim();

      if (!token) {

        return res.status(401).json({
          success: false,
          message: "Invalid authentication token"
        });

      }

      let decoded;

      try {

        decoded = jwt.verify(
          token,
          SECRET
        );

      } catch (error) {

        console.error(
          "JWT verification failed:",
          error.message
        );

        return res.status(401).json({
          success: false,
          message: "Invalid or expired token"
        });

      }

      if (!decoded.id) {

        return res.status(401).json({
          success: false,
          message: "Invalid token"
        });

      }

      /*
       * IMPORTANT:
       * Check the CURRENT database account.
       *
       * This prevents an old admin token from
       * continuing to work after the account is
       * rejected or its role is changed.
       */

      db.query(
        "SELECT id, name, email, role, status FROM users WHERE id=? LIMIT 1",
        [decoded.id],
        (err, rows) => {

          if (err) {

            console.error(
              "Auth database error:",
              err
            );

            return res.status(500).json({
              success: false,
              message: "Authentication service error"
            });

          }

          if (!rows.length) {

            return res.status(401).json({
              success: false,
              message: "Account no longer exists"
            });

          }

          const user = rows[0];

          /*
           * ACCOUNT STATUS CHECK
           */

          if (user.status !== "approved") {

            return res.status(403).json({
              success: false,
              message: "Account is not approved"
            });

          }

          /*
           * ROLE CHECK
           */

          if (
            allowedRoles &&
            !allowedRoles.includes(user.role)
          ) {

            return res.status(403).json({
              success: false,
              message: "Access denied"
            });

          }

          /*
           * Store CURRENT database user
           */

          req.user = user;

          next();

        }
      );

    } catch (error) {

      console.error(
        "Authentication middleware error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Authentication system error"
      });

    }

  };

}


/* =========================================================
   ADMIN ONLY
========================================================= */

function verifyAdmin(req, res, next) {

  return verifyToken(["admin"])(
    req,
    res,
    next
  );

}


/* =========================================================
   VENDOR ONLY
========================================================= */

function verifyVendor(req, res, next) {

  return verifyToken(["vendor"])(
    req,
    res,
    next
  );

}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyVendor
};