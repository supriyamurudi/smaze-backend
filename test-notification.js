// backend/test-notification.js
require("dotenv").config();

async function testNotification() {
  try {
    console.log("Sending test notification...");
    console.log("App ID:", process.env.VITE_ONESIGNAL_APP_ID);
    console.log(
      "API Key:",
      process.env.ONESIGNAL_REST_API_KEY ? "✅ Set" : "❌ Missing",
    );

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.VITE_ONESIGNAL_APP_ID,
        included_segments: ["Subscribed Users"],
        headings: { en: "🍕 New Offer Available!" },
        contents: { en: "50% off Pizza at your favorite shop!" },
        url: "http://localhost:5173/customer/offers",
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Notification sent successfully!");
      console.log("Recipients:", data.recipients);
      console.log("Notification ID:", data.id);
    } else {
      console.error("❌ Error:", data.errors || data);
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

testNotification();
