const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");

// Verify user token
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "No token, authorization denied" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's a user token (has userId)
    if (decoded.userId) {
      // Find user by id
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Attach user info to request
      req.user = {
        userId: user._id,
        email: user.email,
        username: user.username,
        role: "user"
      };
      
      next();
    } else {
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Token is not valid" });
  }
};

// Verify admin token
const verifyAdminToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "No token, authorization denied" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's an admin token (has adminId and role=admin)
    if (decoded.adminId && decoded.role === "admin") {
      // Find admin by id
      const admin = await Admin.findById(decoded.adminId);
      if (!admin) {
        return res.status(401).json({ error: "Admin not found" });
      }
      
      // Attach admin info to request
      req.admin = {
        adminId: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      };
      
      next();
    } else {
      return res.status(401).json({ error: "Access denied. Admin privileges required." });
    }
  } catch (error) {
    console.error("Admin token verification error:", error);
    res.status(401).json({ error: "Token is not valid" });
  }
};

module.exports = {
  verifyToken,
  verifyAdminToken
};
