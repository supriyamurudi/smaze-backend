// backend/src/controllers/offerController.js
// backend/src/controllers/offerController.js
const prisma = require("../config/prisma");
const uploadImage = require("../utils/uploadImage");
const { sendWhatsAppOfferNotification } = require("./notificationController");
const {
  sendOfferPushNotification,
} = require("../services/notificationService");
// ✅ ADD THIS IMPORT
const { triggerOfferCreated } = require("./notificationController");

// ===============================
// Create Offer
// ===============================
const createOffer = async (req, res) => {
  try {
    const { title, description, discount, categoryId, startDate, endDate } =
      req.body;

    if (
      !title ||
      !description ||
      discount === undefined ||
      !categoryId ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const shop = await prisma.shop.findFirst({
      where: {
        ownerId: req.user.id,
      },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Please create your shop first.",
      });
    }

    const category = await prisma.category.findUnique({
      where: {
        id: Number(categoryId),
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    let imageUrl = null;

    if (req.file) {
      imageUrl = await uploadImage(req.file, "smaze/offers");
    }

    const offer = await prisma.offer.create({
      data: {
        title,
        description,
        discount: Number(discount),
        image: imageUrl,
        startDate:
          startDate && !isNaN(new Date(startDate).getTime())
            ? new Date(startDate)
            : null,
        endDate:
          endDate && !isNaN(new Date(endDate).getTime())
            ? new Date(endDate)
            : null,
        shopId: shop.id,
        categoryId: Number(categoryId),
      },
    });

    // ✅ TRIGGER ADMIN NOTIFICATION - New offer created
    try {
      console.log("🔔 Creating admin notification for new offer:", offer.title);
      await triggerOfferCreated(offer, shop);
      console.log("✅ Admin notification created for offer:", offer.title);
    } catch (notifError) {
      console.error("❌ Failed to create admin notification:", notifError);
      // Don't fail the request if notification fails
    }

    // ──────────────────────────────────────────
    // 🚀 SEND NOTIFICATIONS
    // ──────────────────────────────────────────
    let pushResult = null;
    let whatsappResult = null;

    // 1. Send Push Notifications (OneSignal)
    try {
      pushResult = await sendOfferPushNotification(offer);
      if (pushResult?.success) {
        console.log(`✅ Push notification sent for offer: ${offer.id}`);
      } else {
        console.log(
          `ℹ️ Push notification: ${pushResult?.message || "No push sent"}`,
        );
      }
    } catch (pushError) {
      console.error("❌ Push notification error:", pushError.message);
    }

    // 2. Send WhatsApp Notifications (Teaser only)
    try {
      whatsappResult = await sendWhatsAppOfferNotification(offer, shop);
      console.log(`✅ WhatsApp notification sent for offer: ${offer.id}`);
      console.log(
        `📱 Notified ${whatsappResult.customersNotified || 0} customers`,
      );
    } catch (whatsappError) {
      console.error("❌ WhatsApp notification error:", whatsappError.message);
    }
    // ──────────────────────────────────────────

    res.status(201).json({
      success: true,
      message: "Offer created successfully.",
      offer,
      notifications: {
        push: {
          sent: pushResult?.success || false,
          message: pushResult?.message || "No push notification sent",
        },
        whatsapp: {
          notified: whatsappResult?.customersNotified || 0,
          message: whatsappResult?.messagePreview || "No message sent",
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get All Offers
// ===============================
const getOffers = async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            image: true,
            latitude: true,
            longitude: true,
            phone: true,
          },
        },
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      offers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Offer By ID
// ===============================
const getOfferById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            image: true,
            latitude: true,
            longitude: true,
          },
        },
        category: true,
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Offer View
// ===============================
const addOfferView = async (req, res) => {
  try {
    const offerId = Number(req.params.id);
    const customerId = req.user.id;

    console.log("Offer View API HIT");
    console.log("Offer ID:", offerId);
    console.log("Customer:", customerId);

    const existingView = await prisma.offerView.findUnique({
      where: {
        offerId_customerId: {
          offerId,
          customerId,
        },
      },
    });

    if (existingView) {
      return res.status(200).json({
        success: true,
        message: "Already viewed",
      });
    }

    const view = await prisma.offerView.create({
      data: {
        offerId,
        customerId,
      },
    });

    await prisma.offer.update({
      where: {
        id: offerId,
      },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Offer viewed",
      view,
    });
  } catch (error) {
    console.log("ADD VIEW ERROR:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

// ===============================
// Get My Offers
// ===============================
const getMyOffers = async (req, res) => {
  try {
    const shop = await prisma.shop.findFirst({
      where: {
        ownerId: req.user.id,
      },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    const offers = await prisma.offer.findMany({
      where: {
        shopId: shop.id,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      offers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Update Offer
// ===============================
const updateOffer = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, description, discount, categoryId, startDate, endDate } =
      req.body;

    const shop = await prisma.shop.findFirst({
      where: {
        ownerId: req.user.id,
      },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    const offer = await prisma.offer.findFirst({
      where: {
        id,
        shopId: shop.id,
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    let imageUrl = offer.image;

    if (req.file) {
      imageUrl = await uploadImage(req.file, "smaze/offers");
    }

    const updateData = {
      title,
      description,
      discount: Number(discount),
      categoryId: Number(categoryId),
      image: imageUrl,
    };

    if (startDate && !isNaN(new Date(startDate).getTime())) {
      updateData.startDate = new Date(startDate);
    }

    if (endDate && !isNaN(new Date(endDate).getTime())) {
      updateData.endDate = new Date(endDate);
    }

    const updatedOffer = await prisma.offer.update({
      where: {
        id,
      },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully.",
      offer: updatedOffer,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Delete Offer
// ===============================
const deleteOffer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer ID. Please provide a valid number.",
      });
    }

    const shop = await prisma.shop.findFirst({
      where: {
        ownerId: req.user.id,
      },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    const offer = await prisma.offer.findFirst({
      where: {
        id: id,
        shopId: shop.id,
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found or you don't have permission to delete it.",
      });
    }

    await prisma.offer.delete({
      where: {
        id: id,
      },
    });

    console.log(`✅ Offer ${id} deleted by shop owner ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: "Offer deleted successfully.",
    });
  } catch (error) {
    console.error("Delete offer error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete offer.",
    });
  }
};

// ===============================
// Get My Offer By ID (Shop Owner)
// ===============================
const getMyOfferById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const shop = await prisma.shop.findFirst({
      where: {
        ownerId: req.user.id,
      },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const offer = await prisma.offer.findFirst({
      where: {
        id,
        shopId: shop.id,
      },
      include: {
        shop: true,
        category: true,
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createOffer,
  getOffers,
  getOfferById,
  getMyOfferById,
  getMyOffers,
  updateOffer,
  deleteOffer,
  addOfferView,
};
