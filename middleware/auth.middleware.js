const jwt = require("jsonwebtoken");
const db = require("../config/db");

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET is required");

function verifyToken(allowedRoles = null) {
  return (req,res,next)=>{
    const header=req.headers.authorization || "";
    if(!header.startsWith("Bearer "))
      return res.status(401).json({success:false,message:"Authentication required"});

    let decoded;
    try {
      decoded=jwt.verify(header.slice(7).trim(),SECRET);
    } catch {
      return res.status(401).json({success:false,message:"Invalid or expired token"});
    }

    if(!decoded?.id) return res.status(401).json({success:false,message:"Invalid token"});

    db.query(
      `SELECT id,name,email,role,status,pi_uid,pi_username,admin_level,vendor_status,
              business_name,business_phone,business_location,business_description,created_at
       FROM users WHERE id=? LIMIT 1`,
      [decoded.id],
      (err,rows)=>{
        if(err) return res.status(500).json({success:false,message:"Authentication service error"});
        if(!rows.length) return res.status(401).json({success:false,message:"Account no longer exists"});
        const user=rows[0];

        if(user.status!=="approved")
          return res.status(403).json({success:false,message:"Account is not approved"});

        if(allowedRoles && !allowedRoles.includes(user.role))
          return res.status(403).json({success:false,message:"Access denied"});

        user.admin_level=user.role==="admin" ? (user.admin_level||"admin") : "none";
        req.user=user;
        next();
      }
    );
  };
}

function verifyAdmin(req,res,next){
  return verifyToken(["admin"])(req,res,next);
}

function verifySuperAdmin(req,res,next){
  return verifyToken(["admin"])(req,res,()=>{
    if(req.user.admin_level!=="super_admin")
      return res.status(403).json({success:false,message:"Super Admin access required"});
    next();
  });
}

function verifyVendor(req,res,next){
  return verifyToken(["vendor"])(req,res,()=>{
    if(req.user.vendor_status!=="approved")
      return res.status(403).json({success:false,message:"Vendor account is not approved"});
    next();
  });
}

module.exports={verifyToken,verifyAdmin,verifySuperAdmin,verifyVendor};
