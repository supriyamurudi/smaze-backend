// backend/src/controllers/authController.js
const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const generateToken = require("../utils/generateToken");
const {
  generateResetTokenWithExpiry,
  isTokenExpired,
} = require("../utils/tokenUtils");
const { sendPasswordResetEmail } = require("../utils/emailService");

// ================= REGISTER USER =================
const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Role handling
    let userRole = "CUSTOMER";
    if (role) {
      const normalizedRole = role.toUpperCase();
      if (["CUSTOMER", "SHOP_OWNER", "ADMIN"].includes(normalizedRole)) {
        userRole = normalizedRole;
      }
    }

    // Create user
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

    // Generate JWT
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
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

    // ✅ Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check user status
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

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ✅ Prepare user response
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      image: user.image,
      phone: user.phone,
    };

    // ✅ If user is SHOP_OWNER, fetch shop status
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

    // Generate token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Login failed. Please try again.",
    });
  }
};

// ================= GET PROFILE =================
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ If user is SHOP_OWNER, fetch shop status
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
      where: {
        id: req.user.id,
      },
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

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
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

// ================= FORGOT PASSWORD =================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address.",
      });
    }

    // Generate reset token
    const { token, expiry } = generateResetTokenWithExpiry();

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    // Send reset email
    try {
      await sendPasswordResetEmail(email, token, user.name);
    } catch (emailError) {
      console.error("❌ Email sending error:", emailError);
      // Still return success to prevent email enumeration
    }

    return res.status(200).json({
      success: true,
      message: "Password reset link has been sent to your email.",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process request",
    });
  }
};

// ================= RESET PASSWORD =================
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!token || !newPassword || !confirmPassword) {
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

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Find user by reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Check if token is expired
    if (isTokenExpired(user.resetTokenExpiry)) {
      return res.status(400).json({
        success: false,
        message: "Reset token has expired. Please request a new one.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
};

// ================= VERIFY RESET TOKEN =================
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
      },
      select: {
        id: true,
        email: true,
        name: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token",
      });
    }

    if (isTokenExpired(user.resetTokenExpiry)) {
      return res.status(400).json({
        success: false,
        message: "Reset token has expired. Please request a new one.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("❌ Verify token error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify token",
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyResetToken,
};
