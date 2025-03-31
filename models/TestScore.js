const mongoose = require("mongoose");

const TestScoreSchema = new mongoose.Schema({
  testCode: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number,
    required: true
  },
  rank: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index on testCode and userId to ensure a user can only have one score per test
TestScoreSchema.index({ testCode: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("TestScore", TestScoreSchema);
