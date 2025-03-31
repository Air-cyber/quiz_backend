const express = require("express");
const { 
  register, 
  login, 
  verifyToken, 
  getProfile, 
  updateProfile,
  saveQuizResult
} = require("../controllers/authController");
const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes - require authentication
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);
router.post("/quiz-result", verifyToken, saveQuizResult);

// Test protected route
router.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

module.exports = router;
