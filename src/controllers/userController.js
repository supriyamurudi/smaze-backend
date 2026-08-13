const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");

// ===============================
// Get Settings
// ===============================
const getSettings = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        notifyOffers: true,
        notifyExpiry: true,
        notifyShopUpdates: true,
      },
    });

    res.status(200).json({
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

// ===============================
// Update Settings
// ===============================
const updateSettings = async (req, res) => {
  try {
    const { notifyOffers, notifyExpiry, notifyShopUpdates } = req.body;

    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        notifyOffers: notifyOffers !== undefined ? notifyOffers : undefined,
        notifyExpiry: notifyExpiry !== undefined ? notifyExpiry : undefined,
        notifyShopUpdates:
          notifyShopUpdates !== undefined ? notifyShopUpdates : undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings: {
        notifyOffers: user.notifyOffers,
        notifyExpiry: user.notifyExpiry,
        notifyShopUpdates: user.notifyShopUpdates,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Change Password
// ===============================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const match = await bcrypt.compare(currentPassword, user.password);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
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
  changePassword,
};
