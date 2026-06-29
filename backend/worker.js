import { Worker } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Sentiment } from "./src/models/Sentiment.js";
import { recalculateDecayedScores } from "./src/services/decayService.js";

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("👷 Worker connected to MongoDB successfully"))
  .catch(err => console.error("❌ Worker MongoDB connection error:", err));

const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
const redisClient = new Redis(process.env.REDIS_URL);

// Initialize Gemini with structured JSON mode
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

console.log("👷 AI Worker started and ready to use real Gemini AI...");

const worker = new Worker(
  "news_analysis_queue",
  async (job) => {
    const { ticker, headline } = job.data;
    
    console.log(`\n📥 [Job ${job.id}] Analyzing news for ${ticker}`);

    // High-accuracy prompt for detailed explanation and score
    const prompt = `
      You are an expert financial analyst. Analyze the following news headline for the stock ticker: ${ticker}.
      
      HEADLINE: "${headline}"
      
      TASK:
      1. Determine if this news is likely to cause the stock price of ${ticker} to increase or drop.
      2. Assign a sentiment score on a scale from -5 (Extremely Bearish/Negative) to +5 (Extremely Bullish/Positive).
      3. Provide a clear, detailed, 1-2 sentence explanation of why the price will increase or drop based on the news details.
      
      You MUST return a JSON object with this exact schema:
      {
        "score": number, // integer between -5 and 5
        "explanation": "string" // detailed explanation of why the stock will rise or fall
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textOutput = response.text().trim();
    
    // Parse the JSON output from Gemini
    const analysis = JSON.parse(textOutput);
    const sentimentScore = parseInt(analysis.score) || 0;
    const explanation = analysis.explanation || "No explanation provided.";

    console.log(`📊 AI Score for ${ticker}: ${sentimentScore}`);
    console.log(`💡 Rationale: ${explanation}`);

    // 1. Save the analyzed news to MongoDB
    const newSentiment = await Sentiment.create({
      ticker,
      headline,
      score: sentimentScore,
      explanation
    });

    // 2. Trigger instant recalculation of time-decayed scores in Redis ZSET
    await recalculateDecayedScores(redisClient);
    
    // 3. Broadcast the rich update to Redis Pub/Sub channel
    const broadcastPayload = JSON.stringify({
      id: newSentiment._id,
      ticker,
      headline,
      score: sentimentScore,
      explanation,
      timestamp: newSentiment.timestamp
    });
    await redisClient.publish("sentiment_updates", broadcastPayload);

    return { success: true, score: sentimentScore, explanation };
  },
  { connection }
);

worker.on("completed", (job) => console.log(`🏁 Job ${job.id} completed!`));
worker.on("failed", (job, err) => console.error(`❌ Job ${job.id} failed:`, err));