require("dotenv").config();

const express=require("express");
const cors=require("cors");
const helmet=require("helmet");
const compression=require("compression");
const morgan=require("morgan");
const rateLimit=require("express-rate-limit");
const path=require("path");

const app=express();
const PORT=Number(process.env.PORT||5000);

app.set("trust proxy",1);

const configuredOrigins=(process.env.FRONTEND_ORIGINS||"")
  .split(",").map(s=>s.trim()).filter(Boolean);

app.use(cors({
  origin:(origin,callback)=>{
    if(!origin) return callback(null,true);
    if(!configuredOrigins.length) return callback(null,true);
    if(configuredOrigins.includes(origin)) return callback(null,true);
    return callback(new Error("CORS origin not allowed"));
  },
  methods:["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders:["Content-Type","Authorization"],
  credentials:false
}));

app.use(helmet({crossOriginResourcePolicy:{policy:"cross-origin"}}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV==="production"?"combined":"dev"));
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true,limit:"2mb"}));

const authLimiter=rateLimit({
  windowMs:15*60*1000,
  max:100,
  standardHeaders:true,
  legacyHeaders:false
});
app.use("/api/auth",authLimiter);

app.get("/",(req,res)=>res.json({
  success:true,
  status:"OK",
  service:"Charcoal Marketplace API",
  environment:process.env.NODE_ENV||"development"
}));

app.get("/health",(req,res)=>res.json({success:true,status:"healthy"}));

app.use("/api/auth",require("./routes/auth.routes"));
app.use("/api/products",require("./routes/product.routes"));
app.use("/api/orders",require("./routes/orders.routes"));
app.use("/api/payments",require("./routes/payment.routes"));
app.use("/api/admin",require("./routes/admin.routes"));
app.use("/api/admin-request",require("./routes/adminRequest.routes"));
app.use("/api/notifications",require("./routes/notifications.routes"));

app.use("/uploads",express.static(path.join(__dirname,"uploads"),{
  maxAge:"7d",
  index:false
}));

app.use((req,res)=>res.status(404).json({success:false,message:"Route not found"}));

app.use((err,req,res,next)=>{
  console.error("SERVER ERROR:",err);
  if(err.message==="CORS origin not allowed")
    return res.status(403).json({success:false,message:"Origin not allowed"});
  res.status(500).json({success:false,message:"Internal server error"});
});

app.listen(PORT,()=>{
  console.log(`Charcoal Marketplace API running on port ${PORT}`);
  if(!configuredOrigins.length)
    console.warn("WARNING: FRONTEND_ORIGINS is not configured; CORS is open.");
});
