const axios = require("axios");
const TestCode = require("../models/TestCode");
const TestScore = require("../models/TestScore");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const generateQuiz = async (req, res) => {
  try {
    console.log(" Received request:", req.body);  // Log the request data

    // Check if request contains testCode or subject/topic/difficulty
    const { testCode, subject, topic, chapter, difficulty, level, numQuestions = 10 } = req.body;

    let quizSubject, quizTopic, quizChapter, quizDifficulty, testCodeDocument;

    if (testCode) {
      // Find test by code
      testCodeDocument = await TestCode.findOne({ testCode, isActive: true });
      if (!testCodeDocument) {
        return res.status(404).json({ error: "Invalid or inactive test code" });
      }

      // Use test parameters
      quizSubject = testCodeDocument.subject;
      quizTopic = testCodeDocument.topic;
      quizChapter = testCodeDocument.chapter;
      quizDifficulty = testCodeDocument.difficulty;
    } else {
      // Use direct parameters
      if (!subject || !topic || !chapter || (!difficulty && !level)) {
        console.error(" Missing subject, topic, chapter or difficulty/level");
        return res.status(400).json({ error: "Missing subject, topic, chapter or difficulty/level" });
      }

      quizSubject = subject;
      quizTopic = topic;
      quizChapter = chapter;
      quizDifficulty = difficulty || level; // Use either difficulty or level
    }

    const prompt = `Generate ${numQuestions} multiple choice quiz questions on ${quizSubject} focusing on the topic of ${quizTopic}, specifically the chapter "${quizChapter}" with ${quizDifficulty} difficulty.
The questions should be designed for **Class 7 students**, ensuring they align with their curriculum.
The difficulty of the questions should dynamically adjust based on user performance.
Format the response as an array of JSON objects like this:
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B"
    }`;

    console.log("🔹 Sending request to Gemini API...");  // Log before API call
    try {
      const response = await axios.post(
        GEMINI_API_URL,
        {
          contents: [{ parts: [{ text: prompt }] }]  //  Correct request format
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY  // Add API key in headers
          }
        }
      );

      console.log(" Gemini API Response:", JSON.stringify(response.data, null, 2));  // Log full response

      if (!response.data || !response.data.candidates || !response.data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response from Gemini API");
      }

      const generatedText = response.data.candidates[0].content.parts[0].text;
      console.log(" Generated Text:", generatedText);  // Log the generated text

      //  Remove ```json and ```
      const cleanJsonText = generatedText.replace(/```json|```/g, "").trim();
      console.log(" Cleaned JSON Text:", cleanJsonText);  // Log cleaned JSON

      let quizData;
      try {
        quizData = JSON.parse(cleanJsonText);  // Parse cleaned JSON
        console.log(" Parsed Quiz Data:", JSON.stringify(quizData, null, 2));  // Log parsed data
      } catch (err) {
        console.error("JSON Parsing Error:", err.message);
        return res.status(500).json({ error: "Invalid JSON response from Gemini" });
      }

      if (!Array.isArray(quizData) || quizData.length === 0) {
        throw new Error("Received empty quiz data");
      }

      // If using test code, include the test info in the response
      if (testCode) {
        res.json({
          testInfo: {
            testCode: testCodeDocument.testCode,
            subject: testCodeDocument.subject,
            topic: testCodeDocument.topic,
            chapter: testCodeDocument.chapter,
            difficulty: testCodeDocument.difficulty
          },
          questions: quizData
        });
      } else {
        res.json(quizData);
      }
    } catch (apiError) {
      console.error("Gemini API Error:", apiError.response?.data || apiError.message);
      if (apiError.response?.status === 403) {
        return res.status(403).json({
          error: "Invalid or expired Gemini API key. Please check your API key configuration."
        });
      }
      throw apiError;
    }

  } catch (error) {
    console.error("Error generating quiz:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Save test score and calculate ranking
const saveTestScore = async (req, res) => {
  try {
    const { testCode, score, totalQuestions, timeTaken } = req.body;
    const userId = req.user.userId;

    // Find test by code
    const testCodeDoc = await TestCode.findOne({ testCode });
    if (!testCodeDoc) {
      return res.status(404).json({ error: "Test code not found" });
    }

    // Check if user has already taken this test
    let testScore = await TestScore.findOne({ testCode, userId });

    if (testScore) {
      // Update existing score if score is better or time is faster with the same score
      if (score > testScore.score || (score === testScore.score && timeTaken < testScore.timeTaken)) {
        testScore.score = score;
        testScore.totalQuestions = totalQuestions;
        testScore.timeTaken = timeTaken;
        testScore.timestamp = new Date();
        await testScore.save();
      }
    } else {
      // Create new test score
      testScore = new TestScore({
        testCode,
        userId,
        score,
        totalQuestions,
        timeTaken,
      });
      await testScore.save();
    }

    // Calculate rankings for this test
    const allScores = await TestScore.find({ testCode })
      .sort({ score: -1, timeTaken: 1 });

    let currentRank = 1;
    let prevScore = allScores[0].score;
    let prevTime = allScores[0].timeTaken;

    for (let i = 0; i < allScores.length; i++) {
      // If score or time is different from previous, update rank
      if (i > 0 && (allScores[i].score < prevScore ||
        (allScores[i].score === prevScore && allScores[i].timeTaken > prevTime))) {
        currentRank = i + 1;
        prevScore = allScores[i].score;
        prevTime = allScores[i].timeTaken;
      }

      // Update rank
      allScores[i].rank = currentRank;
      await allScores[i].save();
    }

    // Find updated user score with rank
    const updatedScore = await TestScore.findOne({ testCode, userId })
      .populate("userId", "username email");

    res.json({
      message: "Test score saved successfully",
      result: updatedScore,
      rank: updatedScore.rank,
      totalParticipants: allScores.length
    });
  } catch (error) {
    console.error("Error saving test score:", error);
    res.status(500).json({ error: "Server error while saving test score" });
  }
};

// Get user's test scores with rankings
const getUserTestScores = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all user's test scores
    const scores = await TestScore.find({ userId })
      .sort({ timestamp: -1 });

    // Get test details for each score
    const scoresWithDetails = await Promise.all(scores.map(async (score) => {
      const testCodeDoc = await TestCode.findOne({ testCode: score.testCode });
      return {
        ...score.toObject(),
        testDetails: testCodeDoc ? {
          subject: testCodeDoc.subject,
          topic: testCodeDoc.topic,
          chapter: testCodeDoc.chapter,
          difficulty: testCodeDoc.difficulty
        } : null
      };
    }));

    res.json(scoresWithDetails);
  } catch (error) {
    console.error("Error getting user test scores:", error);
    res.status(500).json({ error: "Server error while fetching test scores" });
  }
};

// Get leaderboard for a specific test code (for students)
const getLeaderboard = async (req, res) => {
  try {
    const { testCode } = req.params;

    // Verify the test code exists
    const testCodeDoc = await TestCode.findOne({ testCode });
    if (!testCodeDoc) {
      return res.status(404).json({ error: "Test code not found" });
    }

    // Get all scores for this test code, sorted by score (desc) and time taken (asc)
    const scores = await TestScore.find({ testCode })
      .sort({ score: -1, timeTaken: 1 })
      .populate("userId", "username email");

    // Calculate ranks
    let currentRank = 1;
    let prevScore = -1;
    let prevTime = -1;

    const scoresWithRanks = scores.map((score, index) => {
      // If this is the first score or if the score/time is different from the previous one
      if (index === 0 ||
        score.score !== prevScore ||
        score.timeTaken !== prevTime) {
        currentRank = index + 1;
      }

      prevScore = score.score;
      prevTime = score.timeTaken;

      // Create a new object with all properties from the score document plus rank
      const scoreObj = score.toObject();
      scoreObj.rank = currentRank;

      return scoreObj;
    });

    res.json({
      testInfo: {
        testCode: testCodeDoc.testCode,
        subject: testCodeDoc.subject,
        topic: testCodeDoc.topic,
        chapter: testCodeDoc.chapter,
        difficulty: testCodeDoc.difficulty
      },
      leaderboard: scoresWithRanks
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({ error: "Server error while fetching leaderboard" });
  }
};

// Get topics by subject
const getTopicsBySubject = async (req, res) => {
  try {
    const { subject } = req.params;

    if (!subject) {
      return res.status(400).json({ error: "Subject is required" });
    }

    // Define the topics by subject mapping
    const topicsBySubject = {
      "Mathematics": ["Algebra", "Geometry", "Calculus", "Statistics", "Trigonometry", "Number Theory"],
      "Science": ["Physics", "Chemistry", "Biology", "Astronomy", "Earth Science", "Environmental Science"],
      "Social Studies": ["History", "Geography", "Civics", "Economics", "Political Science", "Sociology"],
      "General Knowledge": ["Current Affairs", "Geography", "Arts & Literature", "Sports", "Technology", "Entertainment"],
      "Machine Learning": ["Supervised Learning", "Unsupervised Learning", "Deep Learning", "Neural Networks", "Natural Language Processing", "Computer Vision"],
    };

    // Get topics for the requested subject
    const topics = topicsBySubject[subject] || [];

    res.json({ topics });
  } catch (error) {
    console.error("Error fetching topics:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { generateQuiz, saveTestScore, getUserTestScores, getLeaderboard, getTopicsBySubject };