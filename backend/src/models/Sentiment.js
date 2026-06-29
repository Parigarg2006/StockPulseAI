import mongoose from 'mongoose';

const SentimentSchema = new mongoose.Schema({
  ticker: { 
    type: String, 
    required: true, 
    index: true 
  },
  headline: { 
    type: String, 
    required: true 
  },
  score: { 
    type: Number, 
    required: true 
  },
  explanation: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now, 
    index: true 
  }
});

export const Sentiment = mongoose.model('Sentiment', SentimentSchema);
