import { Queue } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// 1. Create a dedicated Redis connection for BullMQ
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null, // BullMQ requires this specific setting
});

// 2. Instantiate the Queue
// Name it "news_analysis_queue". The worker will listen to this exact name.
export const newsQueue = new Queue("news_analysis_queue", { connection });