// backend/src/controllers/shopController.js
// backend/src/controllers/shopController.js
const prisma = require("../config/prisma");
const uploadImage = require("../utils/uploadImage");
const deleteImage = require("../utils/deleteImage");
// ✅ ADD THIS IMPORT
const { triggerShopCreated } = require("./notificationController");

// ===============================
// Create Shop
// ===============================
const createShop = async (req, res) => {
  try {
    const { name, address, phone, latitude, longitude, city, description } =
      req.body;

    if (!name || !address || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    console.log("Logged User:", req.user);

    const existingShop = await prisma.shop.findFirst({
      where: {
        ownerId: req.user.id,
      },
    });

    console.log("Existing Shop:", existingShop);

    if (existingShop) {
      return res.status(400).json({
        success: false,
        message: "You already have a shop.",
      });
    }

    let imageUrl = null;

    if (req.file) {
      imageUrl = await uploadImage(req.file, "smaze/shops");
    }

    const shop = await prisma.shop.create({
      data: {
        name,
        address,
        phone,
        city: city || null,
        description: description || null,
        image: imageUrl,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        ownerId: req.user.id,
        status: "pending",
      },
      // ✅ INCLUDE owner data for the notification
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log("Created Shop:", shop);

    // ✅ TRIGGER ADMIN NOTIFICATION - New shop created
    try {
      console.log("🔔 Creating admin notification for new shop:", shop.name);
      await triggerShopCreated(shop);
      console.log("✅ Admin notification created for shop:", shop.name);
    } catch (notifError) {
      console.error("❌ Failed to create admin notification:", notifError);
      // Don't fail the request if notification fails
    }

    return res.status(201).json({
      success: true,
      message: "Shop created successfully. Waiting for admin approval.",
      shop,
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
// Get My Shop - FIXED
// ===============================
const getMyShop = async (req, res) => {
  try {
    console.log("🔍 Fetching shop for user:", req.user.id);

    const shop = await prisma.shop.findFirst({
      where: {
        ownerId: req.user.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        offers: {
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    // ✅ Return 404 if no shop found
    if (!shop) {
      console.log("❌ No shop found for user:", req.user.id);
      return res.status(404).json({
        success: false,
        message: "Shop not found. Please create a shop first.",
      });
    }

    console.log("✅ Shop found:", shop.name);

    return res.status(200).json({
      success: true,
      shop: {
        ...shop,
        city: shop.city || null,
        address: shop.address || null,
        phone: shop.phone || null,
        description: shop.description || null,
        image: shop.image || null,
        status: shop.status || "pending",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching shop:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch shop",
    });
  }
};

// ===============================
// Update Shop
// ===============================
const updateShop = async (req, res) => {
  try {
    const { name, address, phone, latitude, longitude, city, description } =
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

    let imageUrl = shop.image;

    if (req.file) {
      if (shop.image) {
        await deleteImage(shop.image);
      }
      imageUrl = await uploadImage(req.file, "smaze/shops");
    }

    const updatedShop = await prisma.shop.update({
      where: {
        id: shop.id,
      },
      data: {
        name,
        address,
        phone,
        city: city || null,
        description: description || null,
        image: imageUrl,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Shop updated successfully.",
      shop: updatedShop,
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
// Get All Shops (Public) - Only Approved
// ===============================
const getAllShops = async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({
      where: {
        status: "active",
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        offers: {
          where: {
            endDate: {
              gte: new Date(),
            },
          },
          select: {
            id: true,
            title: true,
            discount: true,
            image: true,
            endDate: true,
          },
        },
        _count: {
          select: {
            offers: {
              where: {
                endDate: {
                  gte: new Date(),
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      shops,
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
// Get Shop Analytics
// ===============================
const getShopAnalytics = async (req, res) => {
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

    if (shop.status !== "active") {
      return res.status(403).json({
        success: false,
        message:
          "Your shop is pending approval. Please wait for admin approval.",
        status: shop.status,
      });
    }

    const totalOffers = await prisma.offer.count({
      where: {
        shopId: shop.id,
      },
    });

    const savedCustomers = await prisma.savedOffer.count({
      where: {
        offer: {
          shopId: shop.id,
        },
      },
    });

    const totalViews = await prisma.offer.aggregate({
      where: {
        shopId: shop.id,
      },
      _sum: {
        views: true,
      },
    });

    const uniqueViews = await prisma.offerView.count({
      where: {
        offer: {
          shopId: shop.id,
        },
      },
    });

    const topOffers = await prisma.offer.findMany({
      where: {
        shopId: shop.id,
      },
      include: {
        category: true,
        _count: {
          select: {
            savedOffers: true,
          },
        },
      },
      orderBy: {
        savedOffers: {
          _count: "desc",
        },
      },
      take: 5,
    });

    return res.status(200).json({
      success: true,
      analytics: {
        totalOffers,
        totalViews: totalViews._sum.views || 0,
        uniqueViews,
        savedCustomers,
        redemptions: 0,
        topOffers,
      },
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
// Shop Dashboard - FIXED
// ===============================
const getShopDashboard = async (req, res) => {
  try {
    console.log("📊 Fetching dashboard for user:", req.user.id);

    const shop = await prisma.shop.findFirst({
      where: {
        ownerId: req.user.id,
      },
    });

    // ✅ Return 404 if no shop found
    if (!shop) {
      console.log("❌ No shop found for user:", req.user.id);
      return res.status(404).json({
        success: false,
        message: "Shop not found. Please create a shop first.",
      });
    }

    console.log("📦 Shop found:", shop.name, "Status:", shop.status);

    if (shop.status !== "active") {
      return res.status(403).json({
        success: false,
        message:
          shop.status === "pending"
            ? "Your shop is pending approval. Please wait for admin approval."
            : "Your shop has been rejected. Please contact support.",
        status: shop.status,
      });
    }

    const [totalOffers, activeOffers, savedOffers, totalViews, recentOffers] =
      await Promise.all([
        prisma.offer.count({
          where: { shopId: shop.id },
        }),
        prisma.offer.count({
          where: {
            shopId: shop.id,
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
        }),
        prisma.savedOffer.count({
          where: {
            offer: {
              shopId: shop.id,
            },
          },
        }),
        prisma.offer.aggregate({
          where: { shopId: shop.id },
          _sum: { views: true },
        }),
        prisma.offer.findMany({
          where: { shopId: shop.id },
          include: {
            category: {
              select: { name: true },
            },
            _count: {
              select: { savedOffers: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    const formattedRecentOffers = recentOffers.map((offer) => ({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      discount: offer.discount,
      image: offer.image,
      startDate: offer.startDate,
      endDate: offer.endDate,
      status:
        offer.endDate && new Date(offer.endDate) < new Date()
          ? "expired"
          : "active",
      isActive: !offer.endDate || new Date(offer.endDate) >= new Date(),
      category: offer.category,
      savedCount: offer._count?.savedOffers || 0,
      createdAt: offer.createdAt,
    }));

    return res.status(200).json({
      success: true,
      shop: {
        id: shop.id,
        name: shop.name,
        status: shop.status,
        image: shop.image,
        city: shop.city,
        address: shop.address,
        phone: shop.phone,
      },
      stats: {
        totalOffers: totalOffers || 0,
        activeOffers: activeOffers || 0,
        totalViews: totalViews._sum?.views || 0,
        savedOffers: savedOffers || 0,
      },
      recentOffers: formattedRecentOffers,
    });
  } catch (error) {
    console.error("❌ Error fetching shop dashboard:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard data",
    });
  }
};

// ===============================
// Get Featured Shops (Public)
// ===============================
const getFeaturedShops = async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({
      where: {
        status: "active",
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        offers: {
          where: {
            endDate: {
              gte: new Date(),
            },
          },
          select: {
            id: true,
            title: true,
            discount: true,
            image: true,
            endDate: true,
          },
          take: 3,
        },
        _count: {
          select: {
            offers: {
              where: {
                endDate: {
                  gte: new Date(),
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
    });

    const shopsWithRating = shops.map((shop) => ({
      ...shop,
      rating: 4.5,
    }));

    return res.status(200).json({
      success: true,
      shops: shopsWithRating,
    });
  } catch (error) {
    console.error("Error fetching featured shops:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Shop by ID (Public)
// ===============================
const getShopById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID",
      });
    }

    const shop = await prisma.shop.findUnique({
      where: {
        id: parseInt(id),
        status: "active",
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        offers: {
          where: {
            endDate: {
              gte: new Date(),
            },
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found or not yet approved.",
      });
    }

    return res.status(200).json({
      success: true,
      shop,
    });
  } catch (error) {
    console.error("Error fetching shop by ID:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Admin Only: Get All Shops with Status
// ===============================
const getAdminShops = async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        offers: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      shops,
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
// Admin Only: Update Shop Status
// ===============================
const updateShopStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!["pending", "active", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be pending, active, or rejected",
      });
    }

    const shop = await prisma.shop.update({
      where: {
        id: parseInt(id),
      },
      data: {
        status,
        ...(status === "active" && { approvedAt: new Date() }),
        ...(status === "rejected" && { rejectedAt: new Date() }),
        ...(status !== "rejected" && { rejectionReason: null }),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: `Shop status updated to ${status}`,
      shop,
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
// Export All Functions
// ===============================
module.exports = {
  createShop,
  getMyShop,
  updateShop,
  getAllShops,
  getShopAnalytics,
  getShopDashboard,
  getFeaturedShops,
  getShopById,
  getAdminShops,
  updateShopStatus,
};
