require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Test database connection and create a test user
async function testDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);

    // Check if test user exists
    const testUsername = 'testuser';
    const existingUser = await User.findOne({ username: testUsername });
    
    if (existingUser) {
      console.log(`Test user '${testUsername}' already exists.`);
    } else {
      // Create a test user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      const newUser = new User({
        username: testUsername,
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User'
      });
      
      await newUser.save();
      console.log(`Test user '${testUsername}' created successfully.`);
    }
    
    // Count all users
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);
    
    // List all users (without passwords)
    const users = await User.find().select('-password');
    console.log('\nUsers in database:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email || 'No email'})`);
    });
    
  } catch (error) {
    console.error('Database test error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

// Run the test
testDatabase();
