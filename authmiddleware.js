const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "DEV_SECRET_CHANGE_ME";

/* =========================
   MAIN AUTH MIDDLEWARE
========================= */
function verifyToken(allowedRoles = null) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, SECRET);

      req.user = decoded;

      // ROLE CHECK
      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
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