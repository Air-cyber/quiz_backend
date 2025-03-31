const express = require("express");
const { signup, login, generateTestCode, getTestCodes, getLeaderboard } = require("../controllers/adminController");
const { verifyAdminToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected routes (require admin authentication)
router.post("/generate-test-code", verifyAdminToken, generateTestCode);
router.get("/test-codes", verifyAdminToken, getTestCodes);
router.get("/leaderboard/:testCode", verifyAdminToken, getLeaderboard);

module.exports = router;
