const prisma = require("../config/prisma");

// ==========================================
// Save Offer
// ==========================================
const saveOffer = async (req, res) => {
  try {
    const { offerId } = req.body;

    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: "Offer ID is required.",
      });
    }

    // Check Offer
    const offer = await prisma.offer.findUnique({
      where: {
        id: Number(offerId),
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    // Already Saved?
    const existing = await prisma.savedOffer.findFirst({
      where: {
        userId: req.user.id,
        offerId: Number(offerId),
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Offer already saved.",
      });
    }

    const savedOffer = await prisma.savedOffer.create({
      data: {
        userId: req.user.id,
        offerId: Number(offerId),
      },
    });

    res.status(201).json({
      success: true,
      message: "Offer saved successfully.",
      savedOffer,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Get Saved Offers
// ==========================================
const getSavedOffers = async (req, res) => {
  try {
    const savedOffers = await prisma.savedOffer.findMany({
      where: {
        userId: req.user.id,
      },

      include: {
        offer: {
          include: {
            shop: true,
            category: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      savedOffers,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Remove Saved Offer
// ==========================================
const removeSavedOffer = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const savedOffer = await prisma.savedOffer.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!savedOffer) {
      return res.status(404).json({
        success: false,
        message: "Saved offer not found.",
      });
    }

    await prisma.savedOffer.delete({
      where: {
        id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Saved offer removed successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  saveOffer,
  getSavedOffers,
  removeSavedOffer,
};
