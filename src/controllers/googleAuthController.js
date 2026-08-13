// backend/src/controllers/googleAuthController.js
const passport = require("passport");
const { generateToken } = require("../services/googleAuthService");

// Initiate Google OAuth
const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
  session: true,
});

// Google OAuth Callback
const googleAuthCallback = (req, res, next) => {
  passport.authenticate("google", { session: true }, (err, user) => {
    if (err || !user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
      );
    }

    // Generate JWT token
    const token = generateToken(user);

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/google/callback?token=${token}&user=${encodeURIComponent(
      JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      }),
    )}`;

    res.redirect(redirectUrl);
  })(req, res, next);
};

// Google login from frontend (alternative approach)
const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    // You can decode the token here if needed
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { googleAuth, googleAuthCallback, googleLogin };
