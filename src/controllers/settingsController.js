const prisma = require("../config/prisma.js");

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

module.exports = {
  getSettings,
  updateSettings,
};
