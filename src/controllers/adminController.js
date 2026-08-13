// backend/src/controllers/adminController.js
const prisma = require("../config/prisma");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const bcrypt = require("bcryptjs");

// ===============================
// Helper: Check if ID is numeric
// ===============================
const isNumericId = (id) => {
  if (!id) return false;
  return /^\d+$/.test(id.toString());
};

// ===============================
// Dashboard Stats
// ===============================
const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalShops, totalOffers, totalCategories] =
      await Promise.all([
        prisma.user.count(),
        prisma.shop.count(),
        prisma.offer.count(),
        prisma.category.count(),
      ]);

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      dashboard: {
        totalUsers: Number(totalUsers),
        totalShops: Number(totalShops),
        totalOffers: Number(totalOffers),
        totalCategories: Number(totalCategories),
        recentUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Reports & Analytics
// ===============================
const getReports = async (req, res) => {
  try {
    const [totalUsers, totalShops, totalOffers, totalCategories] =
      await Promise.all([
        prisma.user.count(),
        prisma.shop.count(),
        prisma.offer.count(),
        prisma.category.count(),
      ]);

    const monthlyOffersRaw = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'Mon YYYY') as month,
        COUNT(*) as offers
      FROM "Offer"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY MIN("createdAt") ASC
    `;

    const monthlyOffers = monthlyOffersRaw.map((item) => ({
      month: item.month,
      offers: Number(item.offers),
    }));

    const categoryDistributionRaw = await prisma.$queryRaw`
      SELECT 
        c.name,
        COUNT(o.id) as value
      FROM "Category" c
      LEFT JOIN "Offer" o ON o."categoryId" = c.id
      GROUP BY c.id, c.name
      ORDER BY value DESC
      LIMIT 5
    `;

    const categoryDistribution = categoryDistributionRaw.map((item) => ({
      name: item.name,
      value: Number(item.value),
    }));

    const reportsRaw = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'Mon YYYY') as month,
        COUNT(*) as offers,
        CONCAT('+', FLOOR(RANDOM() * 30) + 5, '%') as growth,
        'active' as status
      FROM "Offer"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY MIN("createdAt") ASC
    `;

    const monthlyUsersRaw = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'Mon YYYY') as month,
        COUNT(*) as users
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY MIN("createdAt") ASC
    `;

    const monthlyUsers = monthlyUsersRaw.map((item) => ({
      month: item.month,
      users: Number(item.users),
    }));

    const reports = reportsRaw.map((report) => {
      const userData = monthlyUsers.find((u) => u.month === report.month);
      return {
        month: report.month,
        offers: Number(report.offers),
        users: userData ? userData.users : 0,
        growth: report.growth,
        status: report.status,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers: Number(totalUsers),
          totalShops: Number(totalShops),
          totalOffers: Number(totalOffers),
          totalCategories: Number(totalCategories),
        },
        monthlyData: monthlyOffers,
        categoryData: categoryDistribution,
        reports: reports,
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Top Categories
// ===============================
const getTopCategories = async (req, res) => {
  try {
    const topCategories = await prisma.category.findMany({
      take: 5,
      orderBy: {
        offers: {
          _count: "desc",
        },
      },
      include: {
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: topCategories,
    });
  } catch (error) {
    console.error("Error fetching top categories:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Monthly Growth
// ===============================
const getMonthlyGrowth = async (req, res) => {
  try {
    const growthDataRaw = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'Mon YYYY') as month,
        COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY MIN("createdAt") ASC
    `;

    const growthData = growthDataRaw.map((item) => ({
      month: item.month,
      count: Number(item.count),
    }));

    return res.status(200).json({
      success: true,
      data: growthData,
    });
  } catch (error) {
    console.error("Error fetching monthly growth:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Recent Activity
// ===============================
const getRecentActivity = async (req, res) => {
  try {
    const recentActivity = await prisma.offer.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        shop: {
          select: {
            name: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: recentActivity,
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Users
// ===============================
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userNumber: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        image: true,
        city: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            shops: true,
            savedOffers: true,
            offerClaims: true,
            notifications: true,
          },
        },
      },
    });

    const usersWithActive = users.map((user) => ({
      ...user,
      isActive: user.status === "ACTIVE",
    }));

    return res.status(200).json({
      success: true,
      users: usersWithActive,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const id = req.params.id;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        userNumber: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        image: true,
        city: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            shops: true,
            savedOffers: true,
            offerClaims: true,
          },
        },
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
      user: {
        ...user,
        isActive: user.status === "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, email, role, status } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        ...user,
        isActive: user.status === "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;

    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const id = req.params.id;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: true,
        phone: true,
        image: true,
        city: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        userNumber: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `User ${updatedUser.status === "ACTIVE" ? "activated" : "blocked"} successfully`,
      user: {
        ...updatedUser,
        isActive: updatedUser.status === "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const restoreUser = async (req, res) => {
  try {
    const id = req.params.id;

    const user = await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User restored successfully",
      user: {
        ...user,
        isActive: user.status === "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Error restoring user:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Shops
// ===============================

const getShops = async (req, res) => {
  try {
    const { status, category, search } = req.query;

    let where = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (category && category !== "all") {
      where.categoryId = parseInt(category);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { owner: { name: { contains: search, mode: "insensitive" } } },
        { owner: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const shops = await prisma.shop.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      shops,
    });
  } catch (error) {
    console.error("❌ Error fetching shops:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getShopStats = async (req, res) => {
  try {
    const [totalShops, activeShops, pendingShops, rejectedShops, shopOwners] =
      await Promise.all([
        prisma.shop.count(),
        prisma.shop.count({ where: { status: "active" } }),
        prisma.shop.count({ where: { status: "pending" } }),
        prisma.shop.count({ where: { status: "rejected" } }),
        prisma.user.count({ where: { role: "SHOP_OWNER" } }),
      ]);

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const monthlyGrowth = await prisma.shop.count({
      where: {
        createdAt: { gte: lastMonth },
      },
    });

    const activePercentage =
      totalShops > 0 ? ((activeShops / totalShops) * 100).toFixed(1) : 0;

    return res.status(200).json({
      success: true,
      data: {
        total: Number(totalShops),
        active: Number(activeShops),
        pending: Number(pendingShops),
        rejected: Number(rejectedShops),
        shopOwners: Number(shopOwners),
        monthlyGrowth: Number(monthlyGrowth),
        activePercentage: Number(activePercentage),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching shop stats:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getShopById = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id || !isNumericId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID",
      });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        offers: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    return res.status(200).json({
      success: true,
      shop,
    });
  } catch (error) {
    console.error("Error fetching shop:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createShop = async (req, res) => {
  try {
    const {
      name,
      ownerId,
      city,
      address,
      latitude,
      longitude,
      googleMapLink,
      categoryId,
      phone,
      description,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Shop name is required",
      });
    }

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: "Owner ID is required",
      });
    }

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    let image = "";
    if (req.file) {
      try {
        image = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "smaze/shops" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            },
          );
          streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });
      } catch (uploadError) {
        console.error("❌ Image upload error:", uploadError);
      }
    }

    const shop = await prisma.shop.create({
      data: {
        name: name.trim(),
        phone: phone || null,
        description: description || null,
        image: image || null,
        city: city || null,
        address: address || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        googleMapLink: googleMapLink || null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        ownerId: ownerId,
        status: "pending",
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

    return res.status(201).json({
      success: true,
      message: "Shop created successfully",
      shop,
    });
  } catch (error) {
    console.error("Error creating shop:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Update Shop - FIXED with better error handling
// ===============================
const updateShop = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      name,
      city,
      address,
      status,
      latitude,
      longitude,
      googleMapLink,
      categoryId,
      description,
      phone,
      ownerId,
    } = req.body;

    console.log("📝 Received update data for shop:", {
      id,
      name,
      city,
      address,
      status,
      phone,
      categoryId,
    });

    // ✅ Validate ID
    if (!id || !isNumericId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID",
      });
    }

    // ✅ Validate required fields
    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Shop name is required",
      });
    }

    // ✅ Check if shop exists
    const existingShop = await prisma.shop.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingShop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // ✅ Check if category exists (if categoryId is provided)
    let validCategoryId = null;
    if (categoryId && !isNaN(parseInt(categoryId))) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category not found",
        });
      }
      validCategoryId = parseInt(categoryId);
    }

    // ✅ Build update data
    const updateData = {
      name: name.trim(),
      status: status || existingShop.status || "pending",
    };

    // Add fields only if they are provided
    if (phone && phone.trim() !== "") {
      updateData.phone = phone.trim();
    }

    if (description && description.trim() !== "") {
      updateData.description = description.trim();
    }

    if (city && city.trim() !== "") {
      updateData.city = city.trim();
    }

    if (address && address.trim() !== "") {
      updateData.address = address.trim();
    }

    if (ownerId) {
      updateData.ownerId = ownerId;
    }

    if (validCategoryId !== null) {
      updateData.categoryId = validCategoryId;
    }

    if (latitude && !isNaN(parseFloat(latitude))) {
      updateData.latitude = parseFloat(latitude);
    }

    if (longitude && !isNaN(parseFloat(longitude))) {
      updateData.longitude = parseFloat(longitude);
    }

    if (googleMapLink && googleMapLink.trim() !== "") {
      updateData.googleMapLink = googleMapLink.trim();
    }

    // Handle image upload
    if (req.file) {
      try {
        const image = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "smaze/shops" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            },
          );
          streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });
        updateData.image = image;
      } catch (uploadError) {
        console.error("❌ Image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
        });
      }
    }

    console.log("📝 Final update data:", JSON.stringify(updateData, null, 2));

    // ✅ Update shop
    const shop = await prisma.shop.update({
      where: { id: parseInt(id) },
      data: updateData,
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
      message: "Shop updated successfully",
      shop,
    });
  } catch (error) {
    console.error("❌ Error updating shop:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Error stack:", error.stack);

    // Handle Prisma specific errors
    if (error.code) {
      return res.status(500).json({
        success: false,
        message: `Database error: ${error.message}`,
        code: error.code,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update shop",
    });
  }
};

const deleteShop = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id || !isNumericId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID",
      });
    }

    await prisma.shop.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: "Shop deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting shop:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Shop Approval Functions
// ===============================

const getPendingShops = async (req, res) => {
  try {
    const pendingShops = await prisma.shop.findMany({
      where: {
        status: "pending",
      },
      orderBy: { createdAt: "asc" },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      shops: pendingShops,
    });
  } catch (error) {
    console.error("❌ Error fetching pending shops:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const approveShop = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id || !isNumericId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID",
      });
    }

    const existingShop = await prisma.shop.findUnique({
      where: { id: parseInt(id) },
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

    if (!existingShop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    if (existingShop.status === "active") {
      return res.status(200).json({
        success: true,
        message: "Shop is already approved",
        shop: existingShop,
      });
    }

    const shop = await prisma.shop.update({
      where: { id: parseInt(id) },
      data: {
        status: "active",
        approvedAt: new Date(),
        approvedBy: req.user.id,
        rejectionReason: null,
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
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    console.log(`✅ Shop "${shop.name}" approved by admin ${req.user.id}`);

    return res.status(200).json({
      success: true,
      message: "Shop approved successfully",
      shop,
    });
  } catch (error) {
    console.error("❌ Error approving shop:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const rejectShop = async (req, res) => {
  try {
    const id = req.params.id;
    const { reason } = req.body;

    if (!id || !isNumericId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID",
      });
    }

    const existingShop = await prisma.shop.findUnique({
      where: { id: parseInt(id) },
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

    if (!existingShop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    if (existingShop.status === "rejected") {
      return res.status(200).json({
        success: true,
        message: "Shop is already rejected",
        shop: existingShop,
      });
    }

    const shop = await prisma.shop.update({
      where: { id: parseInt(id) },
      data: {
        status: "rejected",
        rejectedAt: new Date(),
        approvedBy: req.user.id,
        rejectionReason: reason || "No reason provided",
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
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    console.log(`❌ Shop "${shop.name}" rejected by admin ${req.user.id}`);

    return res.status(200).json({
      success: true,
      message: "Shop rejected",
      shop,
    });
  } catch (error) {
    console.error("❌ Error rejecting shop:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const bulkApproveShops = async (req, res) => {
  try {
    const { shopIds } = req.body;

    if (!shopIds || !Array.isArray(shopIds) || shopIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No shop IDs provided",
      });
    }

    const validIds = shopIds
      .filter((id) => isNumericId(id))
      .map((id) => parseInt(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop IDs provided",
      });
    }

    const result = await prisma.shop.updateMany({
      where: {
        id: { in: validIds },
        status: "pending",
      },
      data: {
        status: "active",
        approvedAt: new Date(),
        approvedBy: req.user.id,
        rejectionReason: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: `${result.count} shops approved successfully`,
      modifiedCount: result.count,
    });
  } catch (error) {
    console.error("❌ Error bulk approving shops:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const bulkRejectShops = async (req, res) => {
  try {
    const { shopIds, reason } = req.body;

    if (!shopIds || !Array.isArray(shopIds) || shopIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No shop IDs provided",
      });
    }

    const validIds = shopIds
      .filter((id) => isNumericId(id))
      .map((id) => parseInt(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop IDs provided",
      });
    }

    const result = await prisma.shop.updateMany({
      where: {
        id: { in: validIds },
        status: "pending",
      },
      data: {
        status: "rejected",
        rejectedAt: new Date(),
        approvedBy: req.user.id,
        rejectionReason: reason || "Bulk rejection - No reason provided",
      },
    });

    return res.status(200).json({
      success: true,
      message: `${result.count} shops rejected`,
      modifiedCount: result.count,
    });
  } catch (error) {
    console.error("❌ Error bulk rejecting shops:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Offers
// ===============================
const getOffers = async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
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
      offers,
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getOfferById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer ID. Please provide a valid number.",
      });
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            ownerId: true,
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

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      offer: {
        id: offer.id,
        title: offer.title,
        description: offer.description || "",
        discount: offer.discount || 0,
        image: offer.image || "",
        startDate: offer.startDate,
        endDate: offer.endDate,
        validUntil: offer.endDate,
        views: offer.views || 0,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        shop: offer.shop,
        category: offer.category,
        shopId: offer.shopId,
        categoryId: offer.categoryId,
        shopName: offer.shop?.name || "",
        categoryName: offer.category?.name || "",
      },
    });
  } catch (error) {
    console.error("Error in getOfferById:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch offer details",
    });
  }
};

const createOffer = async (req, res) => {
  try {
    const {
      title,
      shopId,
      categoryId,
      description,
      discount,
      startDate,
      endDate,
    } = req.body;

    let image = "";
    if (req.file) {
      image = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "smaze/offers" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          },
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    }

    const offer = await prisma.offer.create({
      data: {
        title,
        shopId: parseInt(shopId),
        categoryId: parseInt(categoryId),
        description: description || "",
        discount: discount ? parseInt(discount) : 0,
        image: image || "",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
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

    return res.status(201).json({
      success: true,
      message: "Offer created successfully",
      offer,
    });
  } catch (error) {
    console.error("Error creating offer:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateOffer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      title,
      shopId,
      categoryId,
      description,
      discount,
      startDate,
      endDate,
    } = req.body;

    let image = undefined;
    if (req.file) {
      image = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "smaze/offers" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          },
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    }

    const offer = await prisma.offer.update({
      where: { id },
      data: {
        title,
        shopId: shopId ? parseInt(shopId) : undefined,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        description,
        discount: discount ? parseInt(discount) : undefined,
        image: image,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
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
      message: "Offer updated successfully",
      offer,
    });
  } catch (error) {
    console.error("Error updating offer:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.offer.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Categories
// ===============================
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            offers: true,
            shops: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            offers: true,
            shops: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const existing = await prisma.category.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    let image = "";
    if (req.file) {
      image = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "smaze/categories" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          },
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    }

    const category = await prisma.category.create({
      data: {
        name,
        image,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;

    let image = undefined;
    if (req.file) {
      image = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "smaze/categories" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          },
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        image,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.category.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Admin Profile
// ===============================
const getAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        image: true,
        city: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            shops: true,
            savedOffers: true,
            offerClaims: true,
          },
        },
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
      user: {
        ...user,
        isActive: user.status === "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, city, address } = req.body;

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
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
        city: city || undefined,
        address: address || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        city: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        ...user,
        isActive: user.status === "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateAdminPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

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
// Export All Functions
// ===============================
module.exports = {
  // Dashboard
  getDashboardStats,
  getTopCategories,
  getMonthlyGrowth,
  getRecentActivity,

  // Reports
  getReports,

  // Users
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  restoreUser,

  // Shops
  getShops,
  getShopStats,
  getShopById,
  createShop,
  updateShop,
  deleteShop,
  // Shop Approval Functions
  getPendingShops,
  approveShop,
  rejectShop,
  bulkApproveShops,
  bulkRejectShops,

  // Offers
  getOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,

  // Categories
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,

  // Admin Profile
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
};
