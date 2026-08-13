// backend/src/services/notificationService.js
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
    `🔔 *New Offer Alert!*\n\n` +
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

    // ──────────────────────────────────────────
    // OPTION 1: LOG THE MESSAGE (Current)
    // ──────────────────────────────────────────
    console.log(`📱 WhatsApp Channel Post:`);
    console.log(`─────────────────────────────`);
    console.log(message);
    console.log(`─────────────────────────────`);
    console.log(`📝 Copy this message and paste it in your WhatsApp Channel`);
    console.log(
      `🔗 Channel Link: ${WHATSAPP_CHANNEL_LINK || "Not configured"}`,
    );

    // ──────────────────────────────────────────
    // OPTION 2: SAVE TO DATABASE FOR LATER
    // ──────────────────────────────────────────
    // Save the message to a WhatsAppPosts table for later posting

    return {
      success: true,
      customersNotified: optedCustomers.length,
      messagePreview: message.substring(0, 200),
      fullMessage: message, // Return full message for frontend
      channelLink: WHATSAPP_CHANNEL_LINK,
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
// Send Push Notification to Customers (New Offer)
// ===============================
const sendOfferPushNotification = async (offer) => {
  try {
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    const appId = process.env.VITE_ONESIGNAL_APP_ID;

    if (!apiKey || !appId) {
      console.error("❌ OneSignal credentials missing in .env");
      return { success: false, error: "Missing credentials" };
    }

    if (!prisma) {
      console.error("❌ Prisma client not initialized");
      return { success: false, error: "Prisma client not initialized" };
    }

    // Get all customers with notification enabled
    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        notifyOffers: true,
      },
      select: { id: true },
    });

    if (customers.length === 0) {
      console.log("No customers found with notifications enabled");
      return { success: false, error: "No customers found" };
    }

    // ──────────────────────────────────────────
    // SAVE NOTIFICATIONS TO DATABASE
    // ──────────────────────────────────────────
    const notificationPromises = customers.map((customer) =>
      prisma.notification.create({
        data: {
          userId: customer.id,
          message: `🍕 New Offer: ${offer.title}`,
          isRead: false,
        },
      }),
    );
    await Promise.all(notificationPromises);
    console.log(`✅ Saved ${customers.length} notifications to database`);

    // ──────────────────────────────────────────
    // SEND PUSH NOTIFICATIONS
    // ──────────────────────────────────────────
    const devices = await prisma.device.findMany({
      where: {
        userId: { in: customers.map((c) => c.id) },
        isActive: true,
      },
      select: { playerId: true },
    });

    const playerIds = devices.map((d) => d.playerId);

    if (playerIds.length === 0) {
      console.log("No active devices for customers");
      return { success: true, message: "Notifications saved but no devices" };
    }

    console.log(`Sending push to ${playerIds.length} devices`);

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_player_ids: playerIds,
        headings: { en: `🍕 New Offer: ${offer.title}` },
        contents: { en: `${offer.discount}% off! Check it out now!` },
        url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/customer/offers/${offer.id}`,
        data: {
          offerId: offer.id,
          type: "NEW_OFFER",
        },
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Push notification sent for offer:", offer.id);
      return { success: true, data };
    } else {
      console.error("❌ Push notification error:", data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error("❌ Notification service error:", error.message);
    return { success: false, error: error.message };
  }
};

// ===============================
// Send Combined Notifications (Push + WhatsApp)
// ===============================
const sendOfferNotifications = async (offer, shop) => {
  let pushResult = null;
  let whatsappResult = null;

  // 1. Send Push Notifications
  try {
    pushResult = await sendOfferPushNotification(offer);
    if (pushResult?.success) {
      console.log(`✅ Push notification sent for offer: ${offer.id}`);
    } else {
      console.log(
        `ℹ️ Push notification: ${pushResult?.message || "No push sent"}`,
      );
    }
  } catch (error) {
    console.error("❌ Push notification error:", error.message);
  }

  // 2. Send WhatsApp Notifications
  try {
    whatsappResult = await sendWhatsAppOfferNotification(offer, shop);
    console.log(`✅ WhatsApp notification processed for offer: ${offer.id}`);
    console.log(
      `📱 Notified ${whatsappResult.customersNotified || 0} customers`,
    );
  } catch (error) {
    console.error("❌ WhatsApp notification error:", error.message);
  }

  return {
    push: {
      success: pushResult?.success || false,
      message:
        pushResult?.message || pushResult?.error || "No push notification sent",
      data: pushResult?.data || null,
    },
    whatsapp: {
      success: whatsappResult?.success || false,
      notified: whatsappResult?.customersNotified || 0,
      message: whatsappResult?.messagePreview || "No message sent",
      fullMessage: whatsappResult?.fullMessage || null,
      channelLink: whatsappResult?.channelLink || null,
    },
  };
};

// ===============================
// Send Admin Notification to Shop Owner
// ===============================
const sendAdminNotificationToShopOwner = async (
  shopOwnerId,
  title,
  body,
  data = {},
) => {
  try {
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    const appId = process.env.VITE_ONESIGNAL_APP_ID;

    if (!apiKey || !appId) {
      console.error("❌ OneSignal credentials missing in .env");
      return { success: false, error: "Missing credentials" };
    }

    if (!prisma) {
      console.error("❌ Prisma client not initialized");
      return { success: false, error: "Prisma client not initialized" };
    }

    // Save notification to database first
    await prisma.notification.create({
      data: {
        userId: shopOwnerId,
        message: `${title}: ${body}`,
        isRead: false,
      },
    });
    console.log(`✅ Saved admin notification for shop owner: ${shopOwnerId}`);

    // Get shop owner's device tokens
    const devices = await prisma.device.findMany({
      where: {
        userId: shopOwnerId,
        isActive: true,
      },
      select: { playerId: true },
    });

    const playerIds = devices.map((d) => d.playerId);

    if (playerIds.length === 0) {
      console.log("No active devices for shop owner:", shopOwnerId);
      return { success: true, message: "Notification saved but no devices" };
    }

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: body },
        url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/shop/notifications`,
        data: {
          ...data,
          type: "ADMIN_NOTIFICATION",
        },
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(
        "✅ Admin push notification sent to shop owner:",
        shopOwnerId,
      );
      return { success: true, data: result };
    } else {
      console.error("❌ Admin push notification error:", result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error("❌ Admin notification error:", error.message);
    return { success: false, error: error.message };
  }
};

// ===============================
// Send Notification to All Shop Owners
// ===============================
const sendAdminNotificationToAllShopOwners = async (title, body, data = {}) => {
  try {
    if (!prisma) {
      console.error("❌ Prisma client not initialized");
      return { success: false, error: "Prisma client not initialized" };
    }

    // Get all shop owners
    const shopOwners = await prisma.user.findMany({
      where: {
        role: "SHOP_OWNER",
      },
      select: { id: true },
    });

    if (shopOwners.length === 0) {
      return { success: false, error: "No shop owners found" };
    }

    let successCount = 0;
    let failureCount = 0;

    for (const owner of shopOwners) {
      const result = await sendAdminNotificationToShopOwner(
        owner.id,
        title,
        body,
        data,
      );

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      success: true,
      message: `Sent to ${successCount} shop owners`,
      stats: { successCount, failureCount },
    };
  } catch (error) {
    console.error("Error sending notifications to all shop owners:", error);
    return { success: false, error: error.message };
  }
};

// ===============================
// Save Notification to Database
// ===============================
const saveNotification = async (
  userId,
  title,
  body,
  type,
  offerId = null,
  data = {},
) => {
  try {
    if (!prisma) {
      console.error("❌ Prisma client not initialized");
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        message: `${title}: ${body}`,
        isRead: false,
      },
    });

    return notification;
  } catch (error) {
    console.error("Error saving notification:", error);
    return null;
  }
};

// ===============================
// EXPORTS
// ===============================
module.exports = {
  // Push Notifications
  sendOfferPushNotification,
  sendAdminNotificationToShopOwner,
  sendAdminNotificationToAllShopOwners,

  // WhatsApp Notifications
  sendWhatsAppOfferNotification,
  generateWhatsAppMessage,

  // Combined Notifications
  sendOfferNotifications,

  // Utility
  saveNotification,
};
