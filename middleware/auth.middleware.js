const jwt = require("jsonwebtoken");
const db = require("../config/db");

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  console.error(
    "❌ JWT_SECRET is missing from environment variables"
  );
}


/* =========================================================
   VERIFY JWT + CURRENT USER STATUS + ADMIN LEVEL
========================================================= */

function verifyToken(allowedRoles = null) {

  return (req, res, next) => {

    try {

      const authHeader =
        req.headers.authorization;


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
          message:
            "Invalid authentication token"
        });

      }


      let decoded;


      try {

        decoded =
          jwt.verify(
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
          message:
            "Invalid or expired token"
        });

      }


      if (!decoded.id) {

        return res.status(401).json({
          success: false,
          message:
            "Invalid token"
        });

      }


      /*
      =====================================================
        IMPORTANT

        Always load the CURRENT account from MySQL.

        This means if Super Admin removes someone's
        admin access, their old JWT will no longer
        give them admin privileges.
      =====================================================
      */

      db.query(
        `
        SELECT
          id,
          name,
          email,
          role,
          status,
          pi_uid,
          pi_username,
          admin_level,
          created_at
        FROM users
        WHERE id = ?
        LIMIT 1
        `,

        [decoded.id],

        (err, rows) => {

          if (err) {

            console.error(
              "Auth database error:",
              err
            );

            return res.status(500).json({
              success: false,
              message:
                "Authentication service error"
            });

          }


          if (!rows.length) {

            return res.status(401).json({
              success: false,
              message:
                "Account no longer exists"
            });

          }


          const user =
            rows[0];


          /*
          =================================================
            ACCOUNT STATUS
          =================================================
          */

          if (
            user.status !==
            "approved"
          ) {

            return res.status(403).json({
              success: false,
              message:
                "Account is not approved"
            });

          }


          /*
          =================================================
            ROLE CHECK
          =================================================
          */

          if (
            allowedRoles &&
            !allowedRoles.includes(
              user.role
            )
          ) {

            return res.status(403).json({
              success: false,
              message:
                "Access denied"
            });

          }


          /*
          =================================================
            NORMALIZE ADMIN LEVEL
          =================================================

            Possible values:

            none
            moderator
            admin
            super_admin
          =================================================
          */

          if (
            user.role === "admin"
          ) {

            user.admin_level =
              user.admin_level ||
              "admin";

          } else {

            user.admin_level =
              "none";

          }


          /*
          =================================================
            STORE CURRENT DATABASE USER
          =================================================
          */

          req.user =
            user;


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
        message:
          "Authentication system error"
      });

    }

  };

}


/* =========================================================
   ADMIN ONLY
========================================================= */

function verifyAdmin(
  req,
  res,
  next
) {

  return verifyToken(
    ["admin"]
  )(
    req,
    res,
    next
  );

}


/* =========================================================
   SUPER ADMIN ONLY
========================================================= */

function verifySuperAdmin(
  req,
  res,
  next
) {

  return verifyToken(
    ["admin"]
  )(
    req,
    res,
    () => {

      if (
        req.user.admin_level !==
        "super_admin"
      ) {

        return res.status(403).json({
          success: false,
          message:
            "Super Admin access required"
        });

      }


      next();

    }
  );

}


/* =========================================================
   VENDOR ONLY
========================================================= */

function verifyVendor(
  req,
  res,
  next
) {

  return verifyToken(
    ["vendor"]
  )(
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

  verifySuperAdmin,

  verifyVendor

};