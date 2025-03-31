require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Test authentication functions
async function testAuth() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);

    // Test user credentials
    const testEmail = 'test@example.com';
    const testUsername = 'testuser';
    const testPassword = 'password123';

    // Delete test user if exists (to start fresh)
    await User.deleteOne({ email: testEmail });
    console.log(`Deleted existing test user with email: ${testEmail}`);

    // 1. Test password hashing
    console.log('\n--- Testing Password Hashing ---');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testPassword, salt);
    console.log(`Original password: ${testPassword}`);
    console.log(`Hashed password: ${hashedPassword}`);

    // Verify hashing is working
    const isMatch = await bcrypt.compare(testPassword, hashedPassword);
    console.log(`Password verification result: ${isMatch ? 'SUCCESS' : 'FAILED'}`);

    // 2. Test user creation
    console.log('\n--- Testing User Creation ---');
    const newUser = new User({
      username: testUsername,
      email: testEmail,
      password: hashedPassword,
      name: 'Test User'
    });
    
    await newUser.save();
    console.log(`Test user created with id: ${newUser._id}`);

    // 3. Test user retrieval by email
    console.log('\n--- Testing User Retrieval by Email ---');
    const userByEmail = await User.findOne({ email: testEmail });
    if (userByEmail) {
      console.log(`Found user by email: ${userByEmail.username}`);
      
      // Test password verification
      const passwordMatch = await bcrypt.compare(testPassword, userByEmail.password);
      console.log(`Password verification: ${passwordMatch ? 'SUCCESS' : 'FAILED'}`);
    } else {
      console.log('Failed to find user by email');
    }

    // 4. Test user retrieval by username
    console.log('\n--- Testing User Retrieval by Username ---');
    const userByUsername = await User.findOne({ username: testUsername });
    if (userByUsername) {
      console.log(`Found user by username: ${userByUsername.email}`);
      
      // Test password verification
      const passwordMatch = await bcrypt.compare(testPassword, userByUsername.password);
      console.log(`Password verification: ${passwordMatch ? 'SUCCESS' : 'FAILED'}`);
    } else {
      console.log('Failed to find user by username');
    }

    // 5. Test invalid password
    console.log('\n--- Testing Invalid Password ---');
    const wrongPassword = 'wrongpassword';
    const invalidPasswordMatch = await bcrypt.compare(wrongPassword, userByEmail.password);
    console.log(`Invalid password verification: ${invalidPasswordMatch ? 'FAILED (should be false)' : 'SUCCESS (correctly false)'}`);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

// Run the test
testAuth();
