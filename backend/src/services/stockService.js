// This service now intelligently decides where to get data from
export function startStockSimulation(redisClient) {
  const dataSource = process.env.DATA_SOURCE || "MOCK";

  if (dataSource === "LIVE") {
    console.log("📡 Connecting to Real Finnhub WebSocket...");
    // We will build this out later when you are ready to pay/use real API keys
    // setupFinnhubWebSocket(redisClient);
  } else {
    console.log("🧪 Running in MOCK Mode for high-concurrency stress testing...");
    startMockGenerator(redisClient);
  }
}

function startMockGenerator(redisClient) {
  const stocks = ["AAPL", "TSLA", "GOOGL", "AMZN", "MSFT", "NVDA", "META", "NFLX", "AMD", "COIN"];
  
  setInterval(async () => {
    for (const ticker of stocks) {
      const newPrice = (Math.random() * 1000 + 100).toFixed(2);
      const timestamp = new Date().toISOString();

      // 1. Cache the price in a Hash (For the Initial Load)
      await redisClient.hset(`stock:${ticker}:latest`, {
        price: newPrice,
        timestamp: timestamp,
      });

      // 2. Broadcast the update (For Live dashboard users)
      const message = JSON.stringify({ ticker, price: newPrice, timestamp });
      await redisClient.publish("stock_updates", message);
      
      // console.log(`Broadcasted ${ticker}: $${newPrice}`);
    }
  }, 2000); // Broadcasts every 2 seconds
}