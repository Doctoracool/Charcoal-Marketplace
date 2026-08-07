const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "DEV_SECRET_CHANGE_ME";

/* =========================
   CORE AUTH MIDDLEWARE
========================= */
function verifyToken(allowedRoles = null) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "No token provided"
        });
      }

      const token = authHeader.split(" ")[1];

      let decoded;
      try {
        decoded = jwt.verify(token, SECRET);
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token"
        });
      }

      req.user = decoded;

      // ROLE CHECK (SAFE)
      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      next();

    } catch (err) {
      console.error("Auth middleware error:", err);
      return res.status(500).json({
        success: false,
        message: "Auth system error"
      });
    }
  };
}

/* =========================
   ADMIN ONLY
========================= */
function verifyAdmin(req, res, next) {
  return verifyToken(["admin"])(req, res, next);
}

/* =========================
   VENDOR ONLY
========================= */
function verifyVendor(req, res, next) {
  return verifyToken(["vendor"])(req, res, next);
}

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyVendor
};