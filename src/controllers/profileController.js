// backend/controllers/profileController.js

const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

// ===============================
// Get Profile
// ===============================

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Update Profile
// ===============================

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Update Password
// ===============================

const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Export
// ===============================

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
};
