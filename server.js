require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const quizRoutes = require("./routes/quizRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { verifyToken } = require("./middleware/authMiddleware");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log("Database connection established");
  })
  .catch(err => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });

// Use Auth Routes
app.use("/api/auth", authRoutes);

// Use Admin Routes
app.use("/api/admin", adminRoutes);

// Attach Quiz Routes with authentication middleware
app.use("/api/quiz", verifyToken, quizRoutes);

// Add a route handler for the root path
app.get("/", (req, res) => {
  res.json({ message: "Quiz App API is running" });
});

// Global error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
