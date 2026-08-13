// backend/src/services/googleAuthService.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

// Configure Google Strategy
const configureGoogleStrategy = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;
          const googleId = profile.id;
          const picture = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error("No email found"), null);
          }

          // Check if user exists
          let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
          });

          if (user) {
            // Update Google ID if not set
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId, image: picture || user.image },
              });
            }
            return done(null, user);
          }

          // Create new user
          const randomPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(randomPassword, 10);

          user = await prisma.user.create({
            data: {
              name,
              email: email.toLowerCase(),
              password: hashedPassword,
              googleId,
              image: picture,
              role: "CUSTOMER",
              status: "ACTIVE",
            },
          });

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

module.exports = { configureGoogleStrategy, generateToken };
