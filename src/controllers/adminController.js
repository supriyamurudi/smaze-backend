// backend/src/controllers/adminController.js
const prisma = require("../config/prisma");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const bcrypt = require("bcryptjs");

// ================================
// IMPORTS
// ================================
const {
  triggerShopApproved,
  triggerShopRejected,
  triggerUserStatusChanged,
} = require("./notificationController");

const isNumericId = (id) => id && /^\d+$/.test(id.toString());

// ================================
// DASHBOARD & REPORTS
// ================================
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

    res
      .status(200)
      .json({
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
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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
      SELECT TO_CHAR("createdAt", 'Mon YYYY') as month, COUNT(*) as offers
      FROM "Offer" WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY MIN("createdAt") ASC
    `;

    const categoryDistributionRaw = await prisma.$queryRaw`
      SELECT c.name, COUNT(o.id) as value
      FROM "Category" c LEFT JOIN "Offer" o ON o."categoryId" = c.id
      GROUP BY c.id, c.name ORDER BY value DESC LIMIT 5
    `;

    const monthlyUsersRaw = await prisma.$queryRaw`
      SELECT TO_CHAR("createdAt", 'Mon YYYY') as month, COUNT(*) as users
      FROM "User" WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY MIN("createdAt") ASC
    `;

    const monthlyUsers = monthlyUsersRaw.map((u) => ({
      month: u.month,
      users: Number(u.users),
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers: Number(totalUsers),
          totalShops: Number(totalShops),
          totalOffers: Number(totalOffers),
          totalCategories: Number(totalCategories),
        },
        monthlyData: monthlyOffersRaw.map((m) => ({
          month: m.month,
          offers: Number(m.offers),
        })),
        categoryData: categoryDistributionRaw.map((c) => ({
          name: c.name,
          value: Number(c.value),
        })),
        reports: monthlyOffersRaw.map((report, i) => ({
          month: report.month,
          offers: Number(report.offers),
          users: monthlyUsers[i]?.users || 0,
          growth: `+${Math.floor(Math.random() * 30) + 5}%`,
          status: "active",
        })),
      },
    });
  } catch (error) {
    console.error("Reports error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTopCategories = async (req, res) => {
  try {
    const data = await prisma.category.findMany({
      take: 5,
      orderBy: { offers: { _count: "desc" } },
      include: { _count: { select: { offers: true } } },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMonthlyGrowth = async (req, res) => {
  try {
    const data = await prisma.$queryRaw`
      SELECT TO_CHAR("createdAt", 'Mon YYYY') as month, COUNT(*) as count
      FROM "User" WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY MIN("createdAt") ASC
    `;
    res
      .status(200)
      .json({
        success: true,
        data: data.map((d) => ({ month: d.month, count: Number(d.count) })),
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const data = await prisma.offer.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        shop: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================================
// USERS
// ================================
const userSelect = {
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
};

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        ...userSelect,
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
    res
      .status(200)
      .json({
        success: true,
        users: users.map((u) => ({ ...u, isActive: u.status === "ACTIVE" })),
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        ...userSelect,
        _count: {
          select: { shops: true, savedOffers: true, offerClaims: true },
        },
      },
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res
      .status(200)
      .json({
        success: true,
        user: { ...user, isActive: user.status === "ACTIVE" },
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, role, status } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, email, role, status },
      select: userSelect,
    });
    res
      .status(200)
      .json({
        success: true,
        message: "User updated",
        user: { ...user, isActive: user.status === "ACTIVE" },
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const newStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: newStatus },
      select: userSelect,
    });

    await triggerUserStatusChanged(updatedUser, newStatus).catch((e) =>
      console.error("Notif error:", e),
    );

    res.status(200).json({
      success: true,
      message: `User ${newStatus === "ACTIVE" ? "activated" : "blocked"}`,
      user: { ...updatedUser, isActive: updatedUser.status === "ACTIVE" },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const restoreUser = async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: "ACTIVE" },
      select: { id: true, name: true, email: true, status: true },
    });
    await triggerUserStatusChanged(user, "ACTIVE").catch((e) =>
      console.error("Notif error:", e),
    );
    res
      .status(200)
      .json({
        success: true,
        message: "User restored",
        user: { ...user, isActive: true },
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================================
// SHOPS
// ================================
const shopInclude = {
  owner: { select: { id: true, name: true, email: true, phone: true } },
  category: { select: { id: true, name: true } },
  _count: { select: { offers: true } },
};

const getShops = async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;
    if (category && category !== "all") where.categoryId = parseInt(category);
    if (search)
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { owner: { name: { contains: search, mode: "insensitive" } } },
        { owner: { email: { contains: search, mode: "insensitive" } } },
      ];

    const shops = await prisma.shop.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: shopInclude,
    });
    res.status(200).json({ success: true, shops });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getShopStats = async (req, res) => {
  try {
    const [total, active, pending, rejected, shopOwners] = await Promise.all([
      prisma.shop.count(),
      prisma.shop.count({ where: { status: "active" } }),
      prisma.shop.count({ where: { status: "pending" } }),
      prisma.shop.count({ where: { status: "rejected" } }),
      prisma.user.count({ where: { role: "SHOP_OWNER" } }),
    ]);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const monthlyGrowth = await prisma.shop.count({
      where: { createdAt: { gte: lastMonth } },
    });

    res.status(200).json({
      success: true,
      data: {
        total: Number(total),
        active: Number(active),
        pending: Number(pending),
        rejected: Number(rejected),
        shopOwners: Number(shopOwners),
        monthlyGrowth: Number(monthlyGrowth),
        activePercentage:
          total > 0 ? Number(((active / total) * 100).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getShopById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isNumericId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        ...shopInclude,
        offers: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!shop)
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    res.status(200).json({ success: true, shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    if (!name?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Shop name required" });
    if (!ownerId)
      return res
        .status(400)
        .json({ success: false, message: "Owner ID required" });

    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner)
      return res
        .status(404)
        .json({ success: false, message: "Owner not found" });

    let image = "";
    if (req.file) {
      try {
        image = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "smaze/shops" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            },
          );
          streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });
      } catch (e) {
        console.error("Upload error:", e);
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
        owner: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, message: "Shop created", shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShop = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isNumericId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

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
    if (!name?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Shop name required" });

    const existing = await prisma.shop.findUnique({ where: { id } });
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });

    const updateData = {
      name: name.trim(),
      status: status || existing.status || "pending",
    };
    if (phone?.trim()) updateData.phone = phone.trim();
    if (description?.trim()) updateData.description = description.trim();
    if (city?.trim()) updateData.city = city.trim();
    if (address?.trim()) updateData.address = address.trim();
    if (ownerId) updateData.ownerId = ownerId;
    if (categoryId && !isNaN(parseInt(categoryId))) {
      const cat = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });
      if (!cat)
        return res
          .status(400)
          .json({ success: false, message: "Category not found" });
      updateData.categoryId = parseInt(categoryId);
    }
    if (latitude && !isNaN(parseFloat(latitude)))
      updateData.latitude = parseFloat(latitude);
    if (longitude && !isNaN(parseFloat(longitude)))
      updateData.longitude = parseFloat(longitude);
    if (googleMapLink?.trim()) updateData.googleMapLink = googleMapLink.trim();

    if (req.file) {
      try {
        const image = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "smaze/shops" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            },
          );
          streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });
        updateData.image = image;
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to upload image" });
      }
    }

    const shop = await prisma.shop.update({
      where: { id },
      data: updateData,
      include: shopInclude,
    });
    res.status(200).json({ success: true, message: "Shop updated", shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteShop = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isNumericId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });
    await prisma.shop.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Shop deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================================
// SHOP APPROVAL (WITH NOTIFICATIONS)
// ================================
const getPendingShops = async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: shopInclude,
    });
    res.status(200).json({ success: true, shops });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveShop = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isNumericId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!shop)
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    if (shop.status === "active")
      return res
        .status(200)
        .json({ success: true, message: "Already approved", shop });

    const updated = await prisma.shop.update({
      where: { id },
      data: {
        status: "active",
        approvedAt: new Date(),
        approvedBy: req.user.id,
        rejectionReason: null,
      },
      include: shopInclude,
    });

    await triggerShopApproved(updated).catch((e) =>
      console.error("Notif error:", e),
    );
    res
      .status(200)
      .json({ success: true, message: "Shop approved", shop: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const rejectShop = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isNumericId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const { reason } = req.body;
    const shop = await prisma.shop.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!shop)
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    if (shop.status === "rejected")
      return res
        .status(200)
        .json({ success: true, message: "Already rejected", shop });

    const updated = await prisma.shop.update({
      where: { id },
      data: {
        status: "rejected",
        rejectedAt: new Date(),
        approvedBy: req.user.id,
        rejectionReason: reason || "No reason provided",
      },
      include: shopInclude,
    });

    await triggerShopRejected(updated, reason).catch((e) =>
      console.error("Notif error:", e),
    );
    res
      .status(200)
      .json({ success: true, message: "Shop rejected", shop: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkApproveShops = async (req, res) => {
  try {
    const { shopIds } = req.body;
    if (!shopIds?.length)
      return res.status(400).json({ success: false, message: "No shop IDs" });

    const validIds = shopIds
      .filter((id) => isNumericId(id))
      .map((id) => parseInt(id));
    if (!validIds.length)
      return res.status(400).json({ success: false, message: "Invalid IDs" });

    const shops = await prisma.shop.findMany({
      where: { id: { in: validIds }, status: "pending" },
      include: { owner: { select: { id: true } } },
    });
    const result = await prisma.shop.updateMany({
      where: { id: { in: validIds }, status: "pending" },
      data: {
        status: "active",
        approvedAt: new Date(),
        approvedBy: req.user.id,
        rejectionReason: null,
      },
    });

    for (const shop of shops) {
      await triggerShopApproved(shop).catch((e) =>
        console.error(`Notif error for shop ${shop.id}:`, e),
      );
    }

    res
      .status(200)
      .json({
        success: true,
        message: `${result.count} shops approved`,
        modifiedCount: result.count,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkRejectShops = async (req, res) => {
  try {
    const { shopIds, reason } = req.body;
    if (!shopIds?.length)
      return res.status(400).json({ success: false, message: "No shop IDs" });

    const validIds = shopIds
      .filter((id) => isNumericId(id))
      .map((id) => parseInt(id));
    if (!validIds.length)
      return res.status(400).json({ success: false, message: "Invalid IDs" });

    const shops = await prisma.shop.findMany({
      where: { id: { in: validIds }, status: "pending" },
      include: { owner: { select: { id: true } } },
    });
    const result = await prisma.shop.updateMany({
      where: { id: { in: validIds }, status: "pending" },
      data: {
        status: "rejected",
        rejectedAt: new Date(),
        approvedBy: req.user.id,
        rejectionReason: reason || "Bulk rejection",
      },
    });

    for (const shop of shops) {
      await triggerShopRejected(shop, reason).catch((e) =>
        console.error(`Notif error for shop ${shop.id}:`, e),
      );
    }

    res
      .status(200)
      .json({
        success: true,
        message: `${result.count} shops rejected`,
        modifiedCount: result.count,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================================
// OFFERS
// ================================
const getOffers = async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        shop: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    res.status(200).json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOfferById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Invalid offer ID" });

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, name: true, ownerId: true } },
        category: { select: { id: true, name: true } },
      },
    });
    if (!offer)
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });

    res.status(200).json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
            if (error) reject(error);
            else resolve(result.secure_url);
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
        shop: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, message: "Offer created", offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
            if (error) reject(error);
            else resolve(result.secure_url);
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
        image,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      include: {
        shop: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({ success: true, message: "Offer updated", offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteOffer = async (req, res) => {
  try {
    await prisma.offer.delete({ where: { id: parseInt(req.params.id) } });
    res.status(200).json({ success: true, message: "Offer deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================================
// CATEGORIES
// ================================
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { offers: true, shops: true } } },
    });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { _count: { select: { offers: true, shops: true } } },
    });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Category exists" });

    let image = "";
    if (req.file) {
      image = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "smaze/categories" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          },
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    }

    const category = await prisma.category.create({ data: { name, image } });
    res
      .status(201)
      .json({ success: true, message: "Category created", category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
            if (error) reject(error);
            else resolve(result.secure_url);
          },
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, image },
    });
    res
      .status(200)
      .json({ success: true, message: "Category updated", category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================================
// ADMIN PROFILE
// ================================
const getAdminProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        ...userSelect,
        _count: {
          select: { shops: true, savedOffers: true, offerClaims: true },
        },
      },
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res
      .status(200)
      .json({
        success: true,
        user: { ...user, isActive: user.status === "ACTIVE" },
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const { name, email, phone, city, address } = req.body;
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: req.user.id } },
      });
      if (existing)
        return res
          .status(400)
          .json({ success: false, message: "Email in use" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email, phone, city, address },
      select: userSelect,
    });
    res
      .status(200)
      .json({
        success: true,
        message: "Profile updated",
        user: { ...user, isActive: user.status === "ACTIVE" },
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "Both passwords required" });
    if (newPassword.length < 6)
      return res
        .status(400)
        .json({ success: false, message: "Password must be 6+ chars" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid)
      return res
        .status(400)
        .json({ success: false, message: "Current password incorrect" });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });

    res.status(200).json({ success: true, message: "Password updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================================
// EXPORT
// ================================
module.exports = {
  getDashboardStats,
  getTopCategories,
  getMonthlyGrowth,
  getRecentActivity,
  getReports,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  restoreUser,
  getShops,
  getShopStats,
  getShopById,
  createShop,
  updateShop,
  deleteShop,
  getPendingShops,
  approveShop,
  rejectShop,
  bulkApproveShops,
  bulkRejectShops,
  getOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
};
