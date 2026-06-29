import mongoose from 'mongoose';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { Sentiment } from './src/models/Sentiment.js';
import { recalculateDecayedScores } from './src/services/decayService.js';

dotenv.config();

const redisClient = new Redis(process.env.REDIS_URL);

const headlines = [
  {
    ticker: 'AAPL',
    headline: 'Apple launches high-end AR glasses with cutting-edge optical displays, beating competitor release schedules.',
    score: 4,
    explanation: 'The successful release of high-end AR glasses establishes Apple as a leader in spatial computing, driving new hardware revenue streams.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
  },
  {
    ticker: 'AAPL',
    headline: 'Apple faces regulatory scrutiny in Europe over App Store dominance and anti-steering policies.',
    score: -3,
    explanation: 'European antitrust investigations present legal and financial risks, potentially forcing Apple to lower lucrative App Store fees.',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
  },
  {
    ticker: 'TSLA',
    headline: 'Tesla reports blowout quarterly vehicle delivery numbers, up 25% year-over-year, beating Wall Street expectations.',
    score: 5,
    explanation: 'Surpassing vehicle delivery expectations highlights strong global demand and operating efficiency, directly driving revenue growth.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
  },
  {
    ticker: 'TSLA',
    headline: 'Tesla delays Cybertruck production expansion due to 4680 battery pack assembly constraints.',
    score: -2,
    explanation: 'Battery supply bottlenecks delay scaling of a high-profile vehicle line, threatening short-term production growth and margin targets.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
  },
  {
    ticker: 'GOOGL',
    headline: 'Google Cloud secures multi-billion dollar AI infrastructure contract with global banking alliance.',
    score: 4,
    explanation: 'Securing massive enterprise AI hosting contracts accelerates Google Cloud growth and increases its competitive moat against competitors.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
  },
  {
    ticker: 'GOOGL',
    headline: 'DoJ antitrust trial against Googles ad technology division officially begins.',
    score: -4,
    explanation: 'Federal antitrust lawsuits create significant regulatory overhead and risk a potential court-ordered breakup of Googles core advertising business.',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
  },
  {
    ticker: 'AMZN',
    headline: 'Amazon Web Services launches new ultra-efficient custom AI chips for cloud computing.',
    score: 3,
    explanation: 'Custom silicon reduces chip dependency and energy overhead, improving margins and attracting budget-conscious AI cloud customers.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
  },
  {
    ticker: 'MSFT',
    headline: 'Microsoft integrates advanced co-pilot features across office suites, boosting enterprise subscriber ARPU.',
    score: 4,
    explanation: 'Expanding premium AI tooling driving enterprise subscription upgrades, immediately boosting monthly recurring revenue.',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
  },
  {
    ticker: 'NVDA',
    headline: 'Nvidia next-gen Blackwell GPU architecture reports sold out capacity for the next three quarters.',
    score: 5,
    explanation: 'Extremely high demand and backlog for AI processing chips guarantees sustained record revenue and margin dominance.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
  },
  {
    ticker: 'META',
    headline: 'Meta releases open-source Llama 4 models, claiming parity with proprietary frontier systems.',
    score: 3,
    explanation: 'Leading open-source AI development positions Meta as a default framework choice, reducing proprietary API dependencies.',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
  },
  {
    ticker: 'NFLX',
    headline: 'Netflix subscriber growth slows down in mature markets as password-sharing crackdown benefits tap out.',
    score: -2,
    explanation: 'Decelerating user growth forces reliance on price hikes or ad tiers, creating pressure on short-term valuation multiples.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
  },
  {
    ticker: 'AMD',
    headline: 'AMD signs new custom processor contracts for next-generation consumer console hardware.',
    score: 3,
    explanation: 'Sustained custom chip design wins secure baseline revenue volumes and solidifies AMDs gaming segment leadership.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
  },
  {
    ticker: 'COIN',
    headline: 'Coinbase records highest daily trading volumes of the year amid high cryptocurrency volatility.',
    score: 4,
    explanation: 'Increased trading volume directly boosts transaction commission revenue and retail platform engagement levels.',
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000) // 18 hours ago
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB...");
    
    // Clear old records to start fresh
    await Sentiment.deleteMany({});
    console.log("Cleared old sentiments.");

    // Insert new headlines
    await Sentiment.insertMany(headlines);
    console.log(`Inserted ${headlines.length} mock headlines.`);

    // Recalculate decayed scores and write to Redis ZSET
    await recalculateDecayedScores(redisClient);

    console.log("Seeding complete! Refresh your dashboard.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
