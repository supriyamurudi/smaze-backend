// controllers/whatsappChannelController.js
import {
  getChannelSettings,
  updateChannelSettings,
  trackChannelClick,
  getChannelAnalytics,
  generateChannelQR,
  getWhatsAppOptedCustomers,
  updateWhatsAppOptIn,
  getChannelStats,
} from "../services/whatsappChannelService.js";

/**
 * Get channel settings
 */
export const getSettings = async (req, res) => {
  try {
    const settings = await getChannelSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching channel settings:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch channel settings",
    });
  }
};

/**
 * Update channel settings (Admin only)
 */
export const updateSettings = async (req, res) => {
  try {
    const { channelName, channelLink, description, isActive, logo } = req.body;

    const settings = await updateChannelSettings({
      channelName,
      channelLink,
      description,
      isActive,
      logo,
    });

    res.json({
      success: true,
      data: settings,
      message: "Channel settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating channel settings:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update channel settings",
    });
  }
};

/**
 * Track channel click (Authenticated users)
 */
export const trackClick = async (req, res) => {
  try {
    const { source = "direct" } = req.body;
    const customerId = req.user?.id || null;

    const channel = await getChannelSettings();
    const result = await trackChannelClick(channel.id, customerId, source);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to track channel click",
      });
    }
  } catch (error) {
    console.error("Error tracking channel click:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to track channel click",
    });
  }
};

/**
 * Get channel analytics (Admin only)
 */
export const getAnalytics = async (req, res) => {
  try {
    const analytics = await getChannelAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching channel analytics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch channel analytics",
    });
  }
};

/**
 * Get QR code for channel
 */
export const getQRCode = async (req, res) => {
  try {
    const channel = await getChannelSettings();
    const qrUrl = generateChannelQR(channel.channelLink);

    res.json({
      success: true,
      data: {
        qrUrl,
        channelLink: channel.channelLink,
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate QR code",
    });
  }
};

/**
 * Get WhatsApp opted-in customers (Admin only)
 */
export const getOptedCustomers = async (req, res) => {
  try {
    const customers = await getWhatsAppOptedCustomers();
    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Error fetching opted customers:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch opted customers",
    });
  }
};

/**
 * Update customer WhatsApp opt-in status (Authenticated users)
 */
export const updateOptIn = async (req, res) => {
  try {
    const { optIn } = req.body;
    const customerId = req.user?.id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await updateWhatsAppOptIn(customerId, optIn);

    res.json({
      success: true,
      data: user,
      message: `WhatsApp notifications ${optIn ? "enabled" : "disabled"} successfully`,
    });
  } catch (error) {
    console.error("Error updating WhatsApp opt-in:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update WhatsApp preference",
    });
  }
};

/**
 * Get channel statistics (Authenticated users)
 */
export const getStats = async (req, res) => {
  try {
    const stats = await getChannelStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching channel stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch channel statistics",
    });
  }
};
