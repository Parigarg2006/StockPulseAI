import mongoose from 'mongoose';
import { Sentiment } from './src/models/Sentiment.js';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGO_URL)
  .then(async () => {
    const count = await Sentiment.countDocuments();
    console.log(`\n📊 Total news items in MongoDB: ${count}`);
    
    if (count > 0) {
      const items = await Sentiment.find().sort({ timestamp: -1 }).limit(3);
      console.log("🔍 Latest items in database:");
      console.log(JSON.stringify(items, null, 2));
    } else {
      console.log("ℹ️ No news items found in the database yet.");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection error:", err);
    process.exit(1);
  });
