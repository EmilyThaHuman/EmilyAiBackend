const mongoose = require("mongoose");

// Define the MongoDB schema for chat history
const ChatHistorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

const ChatHistory = mongoose.model("ChatHistory", ChatHistorySchema);

class HistoryService {
  constructor() {
    this.connect();
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("MongoDB connection error:", error);
    }
  }

  async addMessage(userId, role, content) {
    try {
      const chatHistory = await ChatHistory.findOneAndUpdate(
        { userId },
        { $push: { messages: { role, content } } },
        { upsert: true, new: true }
      );
      return chatHistory;
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }

  async getHistory(userId, limit = 10) {
    try {
      const chatHistory = await ChatHistory.findOne({ userId })
        .sort({ "messages.timestamp": -1 })
        .limit(limit);
      return chatHistory ? chatHistory.messages : [];
    } catch (error) {
      console.error("Error getting history:", error);
      throw error;
    }
  }

  async clearHistory(userId) {
    try {
      await ChatHistory.findOneAndDelete({ userId });
    } catch (error) {
      console.error("Error clearing history:", error);
      throw error;
    }
  }

  async searchHistory(userId, query) {
    try {
      const result = await ChatHistory.findOne({
        userId,
        "messages.content": { $regex: query, $options: "i" }
      });
      return result
        ? result.messages.filter((msg) => msg.content.toLowerCase().includes(query.toLowerCase()))
        : [];
    } catch (error) {
      console.error("Error searching history:", error);
      throw error;
    }
  }
}

module.exports = HistoryService;
