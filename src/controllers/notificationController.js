// backend/src/controllers/notificationController.js
const prisma = require("../config/prisma");

// Get environment variables
const WHATSAPP_CHANNEL_LINK = process.env.WHATSAPP_CHANNEL_LINK;
const APP_URL = process.env.APP_URL || "https://smaze.com";

// ===============================
// Generate WhatsApp Message (TEASER - no full details)
// ===============================
const generateWhatsAppMessage = (offer, shop) => {
  const offerUrl = `${APP_URL}/customer/offers/${offer.id}`;

  const message =
    `🔔 *New Offer Alert!\n\n` +
    `🛍️ *${shop?.name || "Our Shop"}* has a new offer!\n\n` +
    `✨ *${offer.title}*\n` +
    `💰 ${offer.discount}% OFF\n` +
    `⏳ Valid until: ${offer.endDate ? new Date(offer.endDate).toLocaleDateString() : "Limited time"}\n\n` +
    `👀 *Want to see the full details?*\n` +
    `📱 Open the Smaze app to view this exclusive offer!\n\n` +
    `🔗 ${offerUrl}\n\n` +
    `Follow our channel for more deals: ${WHATSAPP_CHANNEL_LINK || ""}`;

  return message;
};

// ===============================
// Get User Notifications (Customer)
// ===============================
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
      prisma.notification.count({
        where: { userId },
      }),
    ]);

    res.status(200).json({
      success: true,
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Unread Count (Customer)
// ===============================
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Mark Notification as Read (Customer)
// ===============================
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const updated = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: true },
    });

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification: updated,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Mark All Notifications as Read (Customer)
// ===============================
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Delete Notification (Customer)
// ===============================
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await prisma.notification.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Delete All Notifications (Customer)
// ===============================
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.deleteMany({
      where: { userId },
    });

    res.status(200).json({
      success: true,
      message: "All notifications deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// =========== ADMIN NOTIFICATIONS =============
// =============================================

// ===============================
// Get Admin Notifications
// ===============================
const getAdminNotifications = async (req, res) => {
  try {
    const { limit = 50, page = 1, read, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      isAdminNotification: true,
    };

    // Filter by read status
    if (read === "true") where.isRead = true;
    if (read === "false") where.isRead = false;

    // Filter by type
    if (type && type !== "all") {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip: skip,
      }),
      prisma.adminNotification.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      notifications,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Admin Unread Count
// ===============================
const getAdminUnreadCount = async (req, res) => {
  try {
    const count = await prisma.adminNotification.count({
      where: {
        isRead: false,
        isAdminNotification: true,
      },
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching admin unread count:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Mark Admin Notification as Read
// ===============================
const markAdminNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.adminNotification.findFirst({
      where: {
        id: parseInt(id),
        isAdminNotification: true,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Admin notification not found",
      });
    }

    const updated = await prisma.adminNotification.update({
      where: { id: parseInt(id) },
      data: { isRead: true },
    });

    res.status(200).json({
      success: true,
      message: "Admin notification marked as read",
      notification: updated,
    });
  } catch (error) {
    console.error("Error marking admin notification as read:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Mark All Admin Notifications as Read
// ===============================
const markAllAdminNotificationsAsRead = async (req, res) => {
  try {
    await prisma.adminNotification.updateMany({
      where: {
        isAdminNotification: true,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.status(200).json({
      success: true,
      message: "All admin notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all admin notifications as read:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Delete Admin Notification
// ===============================
const deleteAdminNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.adminNotification.findFirst({
      where: {
        id: parseInt(id),
        isAdminNotification: true,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Admin notification not found",
      });
    }

    await prisma.adminNotification.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      success: true,
      message: "Admin notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting admin notification:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Delete All Admin Notifications
// ===============================
const deleteAllAdminNotifications = async (req, res) => {
  try {
    await prisma.adminNotification.deleteMany({
      where: { isAdminNotification: true },
    });

    res.status(200).json({
      success: true,
      message: "All admin notifications deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting all admin notifications:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Create Admin Notification
// ===============================
const createAdminNotification = async (data) => {
  try {
    const notification = await prisma.adminNotification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type || "system",
        isRead: false,
        isAdminNotification: true,
        link: data.link || null,
        priority: data.priority || "normal",
        metadata: data.metadata || {},
      },
    });

    // Emit WebSocket event if available
    if (global.io) {
      global.io.emit("admin_notification", notification);
    }

    return notification;
  } catch (error) {
    console.error("Error creating admin notification:", error);
    throw error;
  }
};

// ===============================
// Admin: Send Notification to Shop Owner
// ===============================
const adminSendToShopOwner = async (req, res) => {
  try {
    const { shopOwnerId, title, body } = req.body;

    if (!shopOwnerId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "shopOwnerId, title and body are required",
      });
    }

    await prisma.notification.create({
      data: {
        userId: shopOwnerId,
        message: `${title}: ${body}`,
        isRead: false,
      },
    });

    res.status(200).json({
      success: true,
      message: "Notification sent successfully",
    });
  } catch (error) {
    console.error("Error sending notification to shop owner:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Admin: Send Notification to All Shop Owners
// ===============================
const adminSendToAllShopOwners = async (req, res) => {
  try {
    const { title, body } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: "Title and body are required",
      });
    }

    const shopOwners = await prisma.user.findMany({
      where: { role: "SHOP_OWNER" },
      select: { id: true },
    });

    for (const owner of shopOwners) {
      await prisma.notification.create({
        data: {
          userId: owner.id,
          message: `${title}: ${body}`,
          isRead: false,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `Notifications sent to ${shopOwners.length} shop owners`,
    });
  } catch (error) {
    console.error("Error sending notifications to all shop owners:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Send WhatsApp Notification for New Offer (Teaser Only)
// ===============================
const sendWhatsAppOfferNotification = async (offer, shop) => {
  try {
    // Get all customers who opted in for WhatsApp notifications
    const optedCustomers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        status: "ACTIVE",
        notifyWhatsApp: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    if (optedCustomers.length === 0) {
      console.log("No customers opted in for WhatsApp notifications");
      return {
        success: true,
        message: "No customers opted in",
        customersNotified: 0,
      };
    }

    // Generate WhatsApp message (TEASER - no full details)
    const message = generateWhatsAppMessage(offer, shop);

    // Create in-app notifications for all opted-in customers
    const notifications = optedCustomers.map((customer) => ({
      userId: customer.id,
      message: `📱 New offer: ${offer.title} from ${shop.name}. Open the app to view details!`,
      isRead: false,
      createdAt: new Date(),
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    // Create admin notification
    await createAdminNotification({
      title: "📢 WhatsApp Offer Broadcast",
      message: `New offer "${offer.title}" from "${shop.name}" sent to ${optedCustomers.length} customers via WhatsApp`,
      type: "offer",
      link: `/admin/offers/${offer.id}`,
      priority: "normal",
    });

    // Log WhatsApp messages (would be sent via WhatsApp Business API)
    console.log(
      `📱 WhatsApp messages to be sent to ${optedCustomers.length} customers`,
    );
    console.log(`📝 Message preview: ${message.substring(0, 150)}...`);

    return {
      success: true,
      customersNotified: optedCustomers.length,
      messagePreview: message.substring(0, 200),
    };
  } catch (error) {
    console.error("Error sending WhatsApp offer notification:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ===============================
// Trigger Admin Notification on Events
// ===============================

// When a new user registers
const triggerUserRegistered = async (user) => {
  await createAdminNotification({
    title: "👤 New User Registered",
    message: `${user.name || "A new user"} (${user.email}) has registered on the platform`,
    type: "user",
    link: `/admin/users/${user.id}`,
    priority: "normal",
  });
};

// When a new shop is created
const triggerShopCreated = async (shop) => {
  await createAdminNotification({
    title: "🏪 New Shop Listed",
    message: `"${shop.name}" has been listed by ${shop.owner?.name || "a shop owner"}`,
    type: "shop",
    link: `/admin/shops/${shop.id}`,
    priority: "normal",
  });
};

// When a new offer is created
const triggerOfferCreated = async (offer, shop) => {
  await createAdminNotification({
    title: "🏷️ New Offer Created",
    message: `"${offer.title}" (${offer.discount}% OFF) created by "${shop?.name || "a shop"}"`,
    type: "offer",
    link: `/admin/offers/${offer.id}`,
    priority: "normal",
  });
};

// ===============================
// EXPORTS
// ===============================
module.exports = {
  // Customer notifications
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,

  // Admin notifications
  getAdminNotifications,
  getAdminUnreadCount,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  deleteAdminNotification,
  deleteAllAdminNotifications,
  createAdminNotification,

  // Admin actions
  adminSendToShopOwner,
  adminSendToAllShopOwners,
  sendWhatsAppOfferNotification,

  // Triggers
  triggerUserRegistered,
  triggerShopCreated,
  triggerOfferCreated,
};
