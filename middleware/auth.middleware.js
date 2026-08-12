const jwt = require("jsonwebtoken");
const db = require("../config/db");

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("JWT_SECRET is required");
}


/* =========================================================
   VERIFY TOKEN
========================================================= */

function verifyToken(allowedRoles = null) {

  return (req, res, next) => {

    const header =
      req.headers.authorization || "";


    /* =====================================================
       CHECK AUTHORIZATION HEADER
    ===================================================== */

    if (!header.startsWith("Bearer ")) {

      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });

    }


    /* =====================================================
       VERIFY JWT
    ===================================================== */

    let decoded;

    try {

      decoded =
        jwt.verify(
          header.slice(7).trim(),
          SECRET
        );

    } catch (error) {

      console.error(
        "JWT verification error:",
        error
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired token"
      });

    }


    /* =====================================================
       CHECK TOKEN ID
    ===================================================== */

    if (!decoded?.id) {

      console.error(
        "JWT does not contain user ID:",
        decoded
      );

      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });

    }


    console.log(
      "🔐 Verifying user ID:",
      decoded.id
    );


    /* =====================================================
       LOAD USER
    ===================================================== */

    const sql = `
      SELECT
        id,
        name,
        email,
        role,
        status,
        pi_uid,
        pi_username,
        admin_level,
        vendor_status,
        business_name,
        business_phone,
        business_location,
        business_description,
        created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;


    db.query(
      sql,
      [decoded.id],

      (err, rows) => {

        /* =================================================
           DATABASE ERROR
        ================================================= */

        if (err) {

          console.error(
            "❌ AUTH DATABASE QUERY ERROR:"
          );

          console.error(
            "SQL:",
            sql
          );

          console.error(
            "User ID:",
            decoded.id
          );

          console.error(
            "MySQL error:",
            err
          );


          return res.status(500).json({
            success: false,
            message:
              "Authentication service error"
          });

        }


        /* =================================================
           USER NOT FOUND
        ================================================= */

        if (!rows.length) {

          console.error(
            "❌ User does not exist:",
            decoded.id
          );

          return res.status(401).json({
            success: false,
            message:
              "Account no longer exists"
          });

        }


        const user =
          rows[0];


        console.log(
          "✅ User loaded:",
          {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            admin_level:
              user.admin_level,
            vendor_status:
              user.vendor_status
          }
        );


        /* =================================================
           ACCOUNT STATUS
        ================================================= */

        if (
          user.status !== "approved"
        ) {

          return res.status(403).json({
            success: false,
            message:
              "Account is not approved"
          });

        }


        /* =================================================
           ROLE CHECK
        ================================================= */

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


        /* =================================================
           ADMIN LEVEL
        ================================================= */

        user.admin_level =
          user.role === "admin"
            ? (
                user.admin_level ||
                "admin"
              )
            : "none";


        /* =================================================
           ATTACH USER
        ================================================= */

        req.user =
          user;


        next();

      }
    );

  };

}


/* =========================================================
   VERIFY ADMIN
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
   VERIFY SUPER ADMIN
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
   VERIFY VENDOR
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
    () => {

      if (
        req.user.vendor_status !==
        "approved"
      ) {

        return res.status(403).json({
          success: false,
          message:
            "Vendor account is not approved"
        });

      }


      next();

    }
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
