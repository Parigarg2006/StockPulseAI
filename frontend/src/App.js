import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  Activity, 
  Newspaper, 
  Server, 
  CheckCircle2, 
  XCircle,
  RefreshCw, 
  ChevronUp, 
  ChevronDown, 
  Brain,
  History
} from 'lucide-react';

const socket = io('http://localhost:5000');

const companyNames = {
  AAPL: 'Apple Inc.',
  TSLA: 'Tesla Inc.',
  GOOGL: 'Alphabet Inc.',
  AMZN: 'Amazon Inc.',
  MSFT: 'Microsoft Corp.',
  NVDA: 'Nvidia Corp.',
  META: 'Meta Platforms',
  NFLX: 'Netflix Inc.',
  AMD: 'Advanced Micro Devices',
  COIN: 'Coinbase Global'
};

// SVG Sparkline Component (Dashboard view)
function Sparkline({ history, isUp }) {
  if (!history || history.length < 2) {
    return (
      <div className="h-6 flex items-center justify-center text-[9px] text-[#848e9c] font-mono">
        Awaiting ticks...
      </div>
    );
  }
  
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min === 0 ? 1 : max - min;
  
  const points = history.map((price, idx) => {
    const x = (idx * (100 / (history.length - 1))).toFixed(1);
    const y = (26 - ((price - min) / range) * 18 - 4).toFixed(1);
    return `${x},${y}`;
  }).join(' ');
  
  const strokeColor = isUp ? '#089981' : '#F23645';
  const fillColor = isUp ? 'rgba(8, 153, 129, 0.06)' : 'rgba(242, 54, 69, 0.06)';
  const fillPoints = `0,26 ${points} 100,26`;

  return (
    <svg className="w-full h-6 overflow-visible" viewBox="0 0 100 26" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill={fillColor}
        points={fillPoints}
      />
    </svg>
  );
}

// Detailed Area Chart Component (Drawer view)
// Viewport matches TradingView chart colors
function DetailedChart({ history, isUp }) {
  if (!history || history.length < 2) {
    return (
      <div className="h-36 flex items-center justify-center text-xs text-[#848e9c] font-mono border border-[#2A2E39] rounded bg-[#0b0e14]/50">
        Awaiting live ticks to draw chart...
      </div>
    );
  }
  
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min === 0 ? 1 : max - min;
  
  const points = history.map((price, idx) => {
    const x = (idx * (300 / (history.length - 1))).toFixed(1);
    const y = (120 - ((price - min) / range) * 94 - 13).toFixed(1);
    return `${x},${y}`;
  }).join(' ');
  
  const strokeColor = isUp ? '#089981' : '#F23645';
  const fillColorId = isUp ? 'chart-fill-green' : 'chart-fill-red';
  const fillPoints = `0,120 ${points} 300,120`;

  return (
    <svg className="w-full h-36 overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chart-fill-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#089981" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#089981" stopOpacity="0.00"/>
        </linearGradient>
        <linearGradient id="chart-fill-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F23645" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#F23645" stopOpacity="0.00"/>
        </linearGradient>
      </defs>
      
      {/* Gridlines */}
      <line x1="0" y1="30" x2="300" y2="30" stroke="#2A2E39" strokeWidth="0.5" strokeDasharray="2,4" />
      <line x1="0" y1="60" x2="300" y2="60" stroke="#2A2E39" strokeWidth="0.5" strokeDasharray="2,4" />
      <line x1="0" y1="90" x2="300" y2="90" stroke="#2A2E39" strokeWidth="0.5" strokeDasharray="2,4" />
      
      {/* Area Fill Under the Curve */}
      <polygon fill={`url(#${fillColorId})`} points={fillPoints} />
      
      {/* Line polyline */}
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.0"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'news'
  const [selectedStock, setSelectedStock] = useState(null); // Ticker symbol for Drawer details
  
  const [stocks, setStocks] = useState({});
  const [priceHistory, setPriceHistory] = useState({
    AAPL: [], TSLA: [], GOOGL: [], AMZN: [], MSFT: [], NVDA: [], META: [], NFLX: [], AMD: [], COIN: []
  });
  const [flashStates, setFlashStates] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Headline Submissions
  const [headline, setHeadline] = useState('');
  const [ticker, setTicker] = useState('AAPL');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [headlineLogs, setHeadlineLogs] = useState([]);
  
  // Connections Health Check
  const [socketConnected, setSocketConnected] = useState(false);
  const [dbHealth, setDbHealth] = useState({ api: 'checking', redis: 'checking', mongo: 'checking' });

  const fetchLeaderboard = () => {
    fetch('http://localhost:5000/api/leaderboard')
      .then(res => res.json())
      .then(res => setLeaderboard(res.data || []))
      .catch(err => console.error("Error fetching leaderboard:", err));
  };

  const checkHealth = () => {
    fetch('http://localhost:5000/health')
      .then(res => res.json())
      .then(data => {
        setDbHealth({
          api: 'healthy',
          redis: data.redis.includes('Connected') ? 'healthy' : 'error',
          mongo: data.mongo === 'Connected' ? 'healthy' : 'error'
        });
      })
      .catch(() => {
        setDbHealth({ api: 'error', redis: 'error', mongo: 'error' });
      });
  };

  useEffect(() => {
    // 1. Fetch initial states
    fetch('http://localhost:5000/api/stocks')
      .then(res => res.json())
      .then(res => {
        const initialPrices = {};
        const initialHistory = {};
        res.data.forEach(s => {
          initialPrices[s.ticker] = s.price;
          initialHistory[s.ticker] = [s.price];
        });
        setStocks(initialPrices);
        setPriceHistory(prev => {
          const updated = { ...prev };
          Object.keys(initialHistory).forEach(t => {
            updated[t] = initialHistory[t];
          });
          return updated;
        });
      })
      .catch(err => console.error("Error fetching initial stocks:", err));

    // 2. Fetch initial leaderboard
    fetchLeaderboard();

    // 3. Fetch initial news history log
    fetch('http://localhost:5000/api/news')
      .then(res => res.json())
      .then(res => {
        const historyData = (res.data || []).map(item => ({
          ...item,
          id: item._id || item.id,
          status: 'completed'
        }));
        setHeadlineLogs(historyData);
      })
      .catch(err => console.error("Error fetching news history:", err));

    // 4. Check health and setup polling
    checkHealth();
    const healthInterval = setInterval(checkHealth, 15000);

    // 5. Socket connection states
    socket.on('connect', () => {
      console.log('⚡ Socket connected successfully to backend server!');
      setSocketConnected(true);
    });
    socket.on('disconnect', (reason) => {
      console.warn('🔌 Socket disconnected from backend server:', reason);
      setSocketConnected(false);
    });
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error on frontend:', error);
    });
    if (socket.connected) {
      console.log('⚡ Socket already connected on initialization');
      setSocketConnected(true);
    }

    // 6. Listen to real-time stock updates
    socket.on('price_update', (data) => {
      console.log(`📈 Received live price update: ${data.ticker} = $${data.price}`);
      const currentPrice = parseFloat(data.price);
      
      setStocks(prev => {
        const prevPrice = prev[data.ticker];
        if (prevPrice !== undefined) {
          const direction = currentPrice > prevPrice ? 'up' : currentPrice < prevPrice ? 'down' : null;
          if (direction) {
            setFlashStates(prevFlash => ({
              ...prevFlash,
              [data.ticker]: { direction, timestamp: Date.now() }
            }));
          }
        }
        return { ...prev, [data.ticker]: currentPrice };
      });

      setPriceHistory(prev => {
        const history = prev[data.ticker] || [];
        const updated = history.length === 0 ? [currentPrice] : [...history, currentPrice].slice(-30); // Keep up to 30 ticks
        return { ...prev, [data.ticker]: updated };
      });
    });

    // 7. Listen to real-time sentiment updates
    socket.on('sentiment_update', (data) => {
      console.log(`🧠 Received live sentiment update for ${data.ticker}:`, data);
      
      setHeadlineLogs(prev => {
        const index = prev.findIndex(log => log.headline === data.headline && log.ticker === data.ticker && log.status !== 'completed');
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data, status: 'completed' };
          return updated;
        }
        const alreadyExists = prev.some(log => log.id === data.id || log._id === data.id || (log.headline === data.headline && log.ticker === data.ticker));
        if (alreadyExists) return prev;

        return [{ ...data, status: 'completed' }, ...prev].slice(0, 20);
      });

      // Instantly refresh the leaderboard
      fetchLeaderboard();
    });

    // 8. Poll leaderboard every 5 seconds (as per existing requirements)
    const leaderboardInterval = setInterval(fetchLeaderboard, 5000);

    return () => {
      socket.off('price_update');
      socket.off('sentiment_update');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      clearInterval(leaderboardInterval);
      clearInterval(healthInterval);
    };
  }, []);

  const analyzeNews = async (e) => {
    e.preventDefault();
    if (!headline.trim()) return;

    setIsAnalyzing(true);
    const submissionId = Date.now();
    const newLog = {
      id: submissionId,
      ticker,
      headline,
      timestamp: new Date().toLocaleTimeString(),
      status: 'analyzing'
    };

    setHeadlineLogs(prev => [newLog, ...prev]);

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, headline })
      });
      const data = await response.json();
      
      if (data.success) {
        setHeadlineLogs(prev => prev.map(log => 
          log.id === submissionId ? { ...log, status: 'queued', jobId: data.jobId } : log
        ));
      } else {
        setHeadlineLogs(prev => prev.map(log => 
          log.id === submissionId ? { ...log, status: 'failed' } : log
        ));
      }
    } catch (err) {
      console.error(err);
      setHeadlineLogs(prev => prev.map(log => 
        log.id === submissionId ? { ...log, status: 'failed' } : log
      ));
    } finally {
      setHeadline('');
      setIsAnalyzing(false);
    }
  };

  const maxAbsScore = Math.max(...leaderboard.map(item => Math.abs(item.score)), 5);

  // Deep-dive drawer values
  const drawerHistory = selectedStock ? priceHistory[selectedStock] : [];
  const drawerStockPrice = selectedStock ? stocks[selectedStock] : null;
  const drawerFirstPrice = drawerHistory[0] || drawerStockPrice;
  const drawerChange = drawerStockPrice && drawerFirstPrice ? drawerStockPrice - drawerFirstPrice : 0;
  const drawerPercentChange = drawerFirstPrice ? ((drawerChange / drawerFirstPrice) * 100).toFixed(2) : '0.00';
  const drawerIsUp = drawerChange >= 0;
  const drawerNews = headlineLogs.filter(log => log.ticker === selectedStock);

  return (
    <div className="min-h-screen bg-black text-[#d1d4dc] p-4 md:p-8 relative overflow-x-hidden">
      
      {/* Top TradingView-Style Navigation Bar */}
      <header className="flex items-center justify-between py-5 mb-8 bg-black sticky top-0 z-30 select-none">
        <div className="flex items-center gap-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="21" cy="7" r="1" fill="currentColor"/>
            </svg>
            <span className="font-bold text-lg text-white tracking-tight">StockPulse AI</span>
          </div>
          
          {/* Menu links - exact copy of visual style */}
          <nav className="flex items-center gap-6 text-sm font-semibold">
            <button 
              onClick={() => { setActiveTab('dashboard'); setSelectedStock(null); }}
              className={`pb-1 transition-colors duration-200 ${
                activeTab === 'dashboard' 
                  ? 'text-[#2962ff]' 
                  : 'text-[#b2b5be] hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => { setActiveTab('news'); setSelectedStock(null); }}
              className={`pb-1 transition-colors duration-200 ${
                activeTab === 'news' 
                  ? 'text-[#2962ff]' 
                  : 'text-[#b2b5be] hover:text-white'
              }`}
            >
              AI News Center
            </button>
          </nav>
        </div>

        {/* Network Connections */}
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131722] border border-[#2A2E39]">
            <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-[#089981] animate-pulse' : 'bg-[#F23645]'}`}></span>
            <span className="text-[#b2b5be] font-mono">SOCKET</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131722] border border-[#2A2E39]">
            <Server className={`w-3 h-3 ${
              dbHealth.api === 'healthy' && dbHealth.redis === 'healthy' && dbHealth.mongo === 'healthy'
                ? 'text-[#089981]' : 'text-[#F23645]'
            }`} />
            <span className="text-[#b2b5be] font-mono hidden sm:inline">INFRA CONNECTED</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full">
        {activeTab === 'dashboard' ? (
          /* ================================================================= */
          /* DASHBOARD TAB                                                     */
          /* ================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: 10-Stock WATCHLIST grid */}
            <div className="lg:col-span-2 bg-[#131722] p-5 rounded-md border border-[#2A2E39] shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#b2b5be] flex items-center gap-2">
                  <Activity className="text-[#2962ff] w-4 h-4" /> Market Watchlist
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-[#089981] font-medium">
                  <span className="w-1.5 h-1.5 bg-[#089981] rounded-full animate-pulse"></span>
                  <span className="font-mono text-[10px]">LIVE STREAMING</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(stocks).map(([ticker, price]) => {
                  const history = priceHistory[ticker] || [];
                  const firstPrice = history[0] || price;
                  const change = price - firstPrice;
                  const percentChange = firstPrice !== 0 ? ((change / firstPrice) * 100).toFixed(2) : '0.00';
                  const isUp = change >= 0;
                  
                  const flash = flashStates[ticker];
                  const flashClass = flash && (Date.now() - flash.timestamp < 1000)
                    ? (flash.direction === 'up' ? 'animate-flash-up' : 'animate-flash-down')
                    : '';

                  return (
                    <div 
                      key={ticker} 
                      onClick={() => setSelectedStock(ticker)}
                      className={`bg-[#0c0f16] p-4 rounded-md border border-[#2A2E39] flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-slate-500 ${flashClass}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-bold text-sm text-white font-mono">{ticker}</span>
                          <p className="text-[10px] text-[#848e9c] font-medium truncate max-w-[100px] mt-0.5">{companyNames[ticker] || 'Stock Asset'}</p>
                        </div>
                        
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          isUp ? 'bg-[#089981]/10 text-[#089981]' : 'bg-[#F23645]/10 text-[#F23645]'
                        }`}>
                          {isUp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{percentChange}%</span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between mt-4">
                        <span className="text-lg font-bold font-mono text-white">
                          ${price.toFixed(2)}
                        </span>
                        
                        <div className="w-20 bg-black/40 p-1 rounded border border-[#2a2e39]">
                          <Sparkline history={history} isUp={isUp} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: AI Leaderboard */}
            <div className="bg-[#131722] p-5 rounded-md border border-[#2A2E39] shadow-lg h-fit">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#b2b5be] flex items-center gap-2">
                  <Brain className="text-[#2962ff] w-4 h-4" /> AI Sentiment Leaderboard
                </h2>
                <span className="text-[10px] bg-[#2962ff]/10 text-[#2962ff] px-2 py-0.5 rounded font-mono font-bold border border-[#2962ff]/20">
                  REDIS ZSET
                </span>
              </div>

              {leaderboard.length === 0 ? (
                <div className="py-12 text-center text-[#848e9c] text-xs">
                  No sentiment data yet. Submit headlines in AI News Center!
                </div>
              ) : (
                <div className="space-y-4">
                  {leaderboard.map((item) => {
                    const score = item.score;
                    const isPositive = score > 0;
                    const isNegative = score < 0;
                    
                    const barWidth = Math.min(100, (Math.abs(score) / maxAbsScore) * 100);
                    
                    return (
                      <div key={item.ticker} className="flex flex-col gap-2 cursor-pointer" onClick={() => setSelectedStock(item.ticker)}>
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">{item.ticker}</span>
                            <span className="text-[10px] text-[#848e9c] font-normal truncate max-w-[120px]">{companyNames[item.ticker]}</span>
                          </div>
                          
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            isPositive ? 'bg-[#089981]/15 text-[#089981]' :
                            isNegative ? 'bg-[#F23645]/15 text-[#F23645]' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {isPositive ? '+' : ''}{score.toFixed(2)}
                          </span>
                        </div>

                        {/* Bidirectional progress bar container */}
                        <div className="h-1.5 w-full bg-[#0c0f16] rounded-full overflow-hidden flex relative border border-[#2a2e39]">
                          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-[#2a2e39] z-10"></div>
                          
                          {/* Left (Negative) */}
                          <div className="w-1/2 flex justify-end">
                            {isNegative && (
                              <div 
                                style={{ width: `${barWidth}%` }} 
                                className="h-full bg-gradient-to-l from-[#F23645] to-[#f23645]/70 rounded-l-full"
                              ></div>
                            )}
                          </div>

                          {/* Right (Positive) */}
                          <div className="w-1/2">
                            {isPositive && (
                              <div 
                                style={{ width: `${barWidth}%` }} 
                                className="h-full bg-gradient-to-r from-[#089981] to-[#089981]/70 rounded-r-full"
                              ></div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ================================================================= */
          /* AI NEWS CENTER TAB                                                */
          /* ================================================================= */
          <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Submission Form */}
            <div className="bg-[#131722] p-5 rounded-md border border-[#2A2E39] shadow-lg">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#b2b5be] mb-1 flex items-center gap-2">
                <Newspaper className="text-[#2962ff] w-4 h-4" /> Submit Headline for AI Sentiment
              </h2>
              <p className="text-xs text-[#848e9c] mb-6">
                Type in headlines to feed the BullMQ queue. Google Gemini parses the text to output scores and explanations.
              </p>

              <form onSubmit={analyzeNews} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Select Ticker */}
                  <div className="relative md:w-48">
                    <select 
                      className="w-full bg-black border border-[#2a2e39] text-[#d1d4dc] px-4 py-2.5 rounded focus:outline-none focus:border-[#2962ff] text-sm font-semibold appearance-none cursor-pointer"
                      value={ticker} 
                      onChange={e => setTicker(e.target.value)}
                    >
                      {Object.keys(companyNames).map(t => (
                        <option key={t} value={t}>{t} - {companyNames[t]}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Input text */}
                  <input 
                    type="text"
                    className="flex-1 bg-black border border-[#2a2e39] text-white placeholder-[#4c525e] px-4 py-2.5 rounded focus:outline-none focus:border-[#2962ff] text-sm" 
                    placeholder="Enter financial headline (e.g. 'Nvidia reveals groundbreaking chips at keynote')..." 
                    value={headline} 
                    onChange={e => setHeadline(e.target.value)}
                    disabled={isAnalyzing}
                  />

                  {/* Submit */}
                  <button 
                    type="submit"
                    className="bg-[#2962ff] text-white font-semibold text-sm px-6 py-2.5 rounded hover:bg-[#1e53e5] active:bg-[#1546cb] focus:outline-none transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                    disabled={isAnalyzing || !headline.trim()}
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        Analyze Sentiment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Global submissions feed */}
            <div className="bg-[#131722] p-5 rounded-md border border-[#2A2E39] shadow-lg">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#b2b5be] mb-4 flex items-center gap-2">
                <History className="text-[#2962ff] w-4 h-4" /> Recent Sentiment Analysis Logs
              </h2>

              {headlineLogs.length === 0 ? (
                <div className="py-8 text-center text-[#848e9c] text-xs font-medium">
                  No submissions have been recorded in MongoDB yet.
                </div>
              ) : (
                <div className="space-y-3.5 pr-1">
                  {headlineLogs.map((log) => {
                    const isCompleted = log.status === 'completed';
                    const showScore = isCompleted && log.score !== undefined;
                    const isPositive = log.score > 0;
                    const isNegative = log.score < 0;

                    return (
                      <div 
                        key={log.id || log._id} 
                        className="bg-[#0c0f16] p-4 rounded-md border border-[#2A2E39] hover:border-slate-700 transition-all text-xs space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono bg-black px-1.5 py-0.5 rounded border border-[#2a2e39]">
                              {log.ticker}
                            </span>
                            <span className="text-[10px] text-[#848e9c] font-mono">
                              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}
                            </span>
                          </div>
                          
                          {log.status === 'analyzing' && (
                            <span className="text-[#2962ff] flex items-center gap-1 font-semibold">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing...
                            </span>
                          )}
                          {log.status === 'queued' && (
                            <span className="text-amber-500 flex items-center gap-1 font-semibold animate-pulse">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Processing ZSET
                            </span>
                          )}
                          {log.status === 'failed' && (
                            <span className="text-[#F23645] flex items-center gap-1 font-semibold">
                              <XCircle className="w-3.5 h-3.5 text-[#F23645]" /> Failed
                            </span>
                          )}
                          {isCompleted && showScore && (
                            <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                              isPositive ? 'bg-[#089981]/15 text-[#089981] border border-[#089981]/20' :
                              isNegative ? 'bg-[#F23645]/15 text-[#F23645] border border-[#F23645]/20' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {isPositive ? '+' : ''}{log.score}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-slate-200 font-semibold leading-relaxed">
                          "{log.headline}"
                        </p>

                        {isCompleted && log.explanation && (
                          <div className="bg-black p-2.5 rounded border border-[#2a2e39] mt-1">
                            <p className="text-[#b2b5be] text-[11px] leading-relaxed">
                              <span className="text-[#2962ff] font-semibold">💡 AI Explanation:</span> {log.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Backdrop for closing drawer when clicking outside */}
      {selectedStock && (
        <div 
          onClick={() => setSelectedStock(null)}
          className="fixed inset-0 bg-black/60 z-40 transition-opacity"
        />
      )}

      {/* Slide-out Stock Deep-Dive Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[440px] bg-[#131722] border-l border-[#2a2e39] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          selectedStock ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedStock && (
          <>
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#2a2e39] flex items-center justify-between bg-black/25">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-mono text-white">{selectedStock}</span>
                  <span className="text-xs text-[#848e9c] font-medium">{companyNames[selectedStock]}</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-bold font-mono text-white">
                    ${stocks[selectedStock]?.toFixed(2) || '0.00'}
                  </span>
                  <span className={`text-xs font-semibold flex items-center ${
                    drawerIsUp ? 'text-[#089981]' : 'text-[#F23645]'
                  }`}>
                    {drawerIsUp ? '+' : ''}{drawerPercentChange}%
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStock(null)}
                className="text-[#848e9c] hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Detailed Performance Chart */}
              <div className="bg-[#0c0f16] p-4 rounded-md border border-[#2a2e39]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#848e9c] mb-4">Price Performance</h3>
                <DetailedChart history={drawerHistory} isUp={drawerIsUp} />
                <div className="flex justify-between items-center text-[10px] text-[#848e9c] font-mono mt-3 border-t border-[#2a2e39]/40 pt-2.5">
                  <span>Session Min: ${Math.min(...drawerHistory, 0).toFixed(2)}</span>
                  <span>Session Max: ${Math.max(...drawerHistory, 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Stock-specific AI sentiment list */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#848e9c] mb-3">AI Sentiment Timeline</h3>
                {drawerNews.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[#2a2e39] rounded text-[#848e9c] text-xs">
                    No sentiment news recorded for {selectedStock} yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {drawerNews.map((log) => {
                      const isPositive = log.score > 0;
                      const isNegative = log.score < 0;
                      return (
                        <div key={log.id || log._id} className="bg-[#0c0f16] p-3 rounded-md border border-[#2a2e39] text-xs space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-[#848e9c] font-mono">
                              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                              isPositive ? 'bg-[#089981]/15 text-[#089981]' :
                              isNegative ? 'bg-[#F23645]/15 text-[#F23645]' :
                              'bg-slate-800 text-[#848e9c]'
                            }`}>
                              {isPositive ? '+' : ''}{log.score}
                            </span>
                          </div>
                          <p className="text-slate-200 font-medium leading-relaxed">
                            "{log.headline}"
                          </p>
                          {log.explanation && (
                            <p className="text-[#b2b5be] text-[10px] border-t border-[#2a2e39]/40 pt-1.5 leading-relaxed">
                              <span className="text-[#2962ff] font-semibold">💡 AI Explanation:</span> {log.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}