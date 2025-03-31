const express = require("express");
const { generateQuiz, saveTestScore, getUserTestScores, getLeaderboard, getTopicsBySubject } = require("../controllers/quizController");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

// All routes require user authentication
router.post("/generate", verifyToken, generateQuiz);
router.post("/test-score", verifyToken, saveTestScore);
router.get("/test-scores", verifyToken, getUserTestScores);
router.get("/leaderboard/:testCode", verifyToken, getLeaderboard);
router.get("/topics/:subject", verifyToken, getTopicsBySubject);

module.exports = router;
