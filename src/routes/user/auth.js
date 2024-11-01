const { passport } = require("@config/index");
const express = require("express");

const router = express.Router();

// Initiate Google OAuth
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Handle Google OAuth callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);

module.exports = router;
