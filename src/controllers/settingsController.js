const prisma = require("../config/prisma.js");
const bcrypt = require("bcryptjs"); // ✅ Ensure you have bcryptjs installed

// GET SETTINGS
const getSettings = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        name: true,
        email: true,
        phone: true,
        city: true,
        address: true,

        notifyOffers: true,
        notifyExpiry: true,
        notifyShopUpdates: true,

        preferredCategories: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      settings: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE SETTINGS
const updateSettings = async (req, res) => {
  try {
    const {
      city,
      address,
      notifyOffers,
      notifyExpiry,
      notifyShopUpdates,
      preferredCategories,
    } = req.body;

    const updated = await prisma.user.update({
      where: {
        id: req.user.id,
      },

      data: {
        ...(city !== undefined && { city }),
        ...(address !== undefined && { address }),

        ...(notifyOffers !== undefined && { notifyOffers }),
        ...(notifyExpiry !== undefined && { notifyExpiry }),
        ...(notifyShopUpdates !== undefined && {
          notifyShopUpdates,
        }),

        ...(preferredCategories !== undefined && {
          preferredCategories,
        }),
      },
    });

    res.json({
      success: true,
      message: "Settings updated successfully",
      settings: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ NEW: UPDATE PASSWORD
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if current password is correct
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  updatePassword, // ✅ Export it
};
