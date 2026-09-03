// backend/src/controllers/authController.js
const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken"); // ✅ ADD THIS (for checkAuth)

const { triggerUserRegistered } = require("./notificationController");

// ================= REGISTER USER =================
const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let userRole = "CUSTOMER";
    if (role) {
      const normalizedRole = role.toUpperCase();
      if (["CUSTOMER", "SHOP_OWNER", "ADMIN"].includes(normalizedRole)) {
        userRole = normalizedRole;
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: userRole,
        status: "ACTIVE",
      },
    });

    // ✅ TRIGGER ADMIN NOTIFICATION - New user registered
    try {
      console.log("🔔 Creating admin notification for new user:", user.email);
      await triggerUserRegistered(user);
      console.log("✅ Admin notification created for user:", user.email);
    } catch (notifError) {
      console.error("❌ Failed to create admin notification:", notifError);
    }

    const token = generateToken(user);

    // ✅ SET HTTPONLY COOKIE
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= LOGIN USER =================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status === "BLOCKED") {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked. Please contact the administrator.",
      });
    }

    if (user.status === "DELETED") {
      return res.status(403).json({
        success: false,
        message: "This account is no longer available.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      image: user.image,
      phone: user.phone,
    };

    if (user.role === "SHOP_OWNER") {
      const shop = await prisma.shop.findFirst({
        where: { ownerId: user.id },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

      userResponse.hasShop = !!shop;
      userResponse.shopStatus = shop?.status || null;
      userResponse.shopName = shop?.name || null;
      userResponse.shopId = shop?.id || null;
    }

    const token = generateToken(user);

    // ✅ FIXED: SET HTTPONLY COOKIE (Matches register exactly)
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none", // ✅ MUST be "none" for cross-domain
      domain: ".smaze.in", // ✅ MUST include domain for cross-domain
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse,
      // ❌ token REMOVED - Cookie handles it now
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Login failed. Please try again.",
    });
  }
};

// ================= LOGOUT =================
const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    domain: ".smaze.in", // ✅ Clear it properly
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// ================= CHECK AUTH (USED BY FRONTEND) =================
const checkAuth = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) return res.status(401).json({ success: false });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(401).json({ success: false });
  }
};

// ================= GET PROFILE =================
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        address: true,
        image: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let shopInfo = null;
    if (user.role === "SHOP_OWNER") {
      const shop = await prisma.shop.findFirst({
        where: { ownerId: user.id },
        select: {
          id: true,
          name: true,
          status: true,
          address: true,
          phone: true,
          image: true,
        },
      });
      shopInfo = shop;
    }

    res.status(200).json({
      success: true,
      user: {
        ...user,
        shop: shopInfo,
        hasShop: !!shopInfo,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= UPDATE PROFILE =================
const updateProfile = async (req, res) => {
  try {
    const { name, phone, city, address } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(city && { city }),
        ...(address && { address }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        address: true,
        image: true,
        role: true,
        status: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= CHANGE PASSWORD =================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= RESET PASSWORD (SIMPLE - NO EMAIL VERIFICATION) =================
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email address",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
};

// ================= EXPORT =================
module.exports = {
  register,
  login,
  logout, // ✅ ADDED
  checkAuth, // ✅ ADDED
  getProfile,
  updateProfile,
  changePassword,
  resetPassword,
};
