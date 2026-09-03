// backend/middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

// ===========================
// Protect Middleware
// ===========================
const protect = async (req, res, next) => {
  try {
    let token;

    // ✅ 1. READ FROM HTTPONLY COOKIE FIRST (NEW!)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // ✅ 2. FALLBACK: Read from Authorization header (for old requests)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

// ===========================
// Admin Middleware
// ===========================
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Only admin can access this resource.",
    });
  }

  next();
};

// ===========================
// Role-Based Authorization Middleware
// ===========================
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this resource. Allowed roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

module.exports = {
  protect,
  isAdmin,
  authorize, // ✅ Add this
};
