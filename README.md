# MarketFeed | Enterprise Strategic Intelligence Platform

A professional, AI-powered news aggregation and strategic intelligence platform designed for enterprise account managers and customer success teams. Tracks 50+ key global companies across finance, technology, AI, e-commerce, social media, and more.

## Key Features

### Intelligence & Analytics
- **AI Chat Assistant** — Ask natural language questions about market trends, specific companies, or engagement opportunities.
- **Strategy Reports** — Generate Daily, Weekly, Monthly, or Quarterly strategic reports aligned with a 5-dimension rubric (Industry Trends, Use Cases, Buying Committee, Success Stories, Differentiation).
- **Daily Podcast** — AI-generated audio briefing of the top 5 most relevant news stories, with playback speed controls (1x–2x).

### News Aggregation
- **No API Keys Required** — Uses public RSS feeds, Google News, Bing News, and optimized web scraping.
- **Deep Source Coverage** — LinkedIn posts, Official Website newsrooms/press releases/blogs, Google News, Bing News.
- **Smart Categorization** — Automatically classifies news into Strategic Insights, Finance, Technology, Leadership, and ESG.
- **Login-Wall Filtering** — Automatically excludes articles that require login or subscription.

### User Interface
- **Pagination** — Browse all results with 20/50/100 per page options and full page navigation.
- **Time Filters** — 1h, 6h, 12h, 24h, 48h, 72h, 1 week, 1 month.
- **Fuzzy Search** — Partial keyword matching (e.g., "hsbc swiss" finds "HSBC's Swiss unit...").
- **Sort Options** — Latest, Oldest, Relevance.
- **Dark Mode** — Full dark theme support.
- **Responsive Design** — Optimized for desktop, tablet, and mobile.
- **Yearly Summaries** — Historical event summaries for 2023–2026.

## Tracked Companies (53)

| Sector | Companies |
|--------|-----------|
| **Finance** | HSBC, DBS, Bank of China, Citigroup, Standard Chartered, JPMorgan Chase, Aeon Credit, Bank of America |
| **Crypto & Fintech** | Binance, Coinbase, Stripe, PayPal |
| **Big Tech** | Apple, Alphabet (Google), Microsoft, Amazon, Meta, Nvidia, Samsung, TSMC, Adobe |
| **AI & Data** | OpenAI, Anthropic, Databricks, ByteDance, Palantir, DeepSeek, Moonshot AI |
| **E-commerce & Retail** | Alibaba, Temu, Shein, ShopBack, Walmart, Nike |
| **Mobility & Travel** | Grab, Didi, Gojek, Cathay Pacific, Ctrip |
| **Telecom** | Vodafone, Singtel, StarHub |
| **Entertainment** | Netflix, Tencent, Disney |
| **Social Media** | Reddit, X (Twitter), RedNote (Xiaohongshu) |
| **Auto & Energy** | Tesla, Helios Energy, CATL (宁德时代) |
| **Aerospace** | SpaceX |
| **Logistics** | SF Express (顺丰) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3 (Custom Properties, Glassmorphism), Vanilla JavaScript |
| **Backend** | Node.js (>=18), Express |
| **Database** | SQLite with compound indexes and auto-cleanup (120-day retention) |
| **TTS** | Google TTS by default, optional `edge-tts` override via env |
| **Scraping** | Axios, RSS-Parser, Bing/Google News parsing |
| **Security** | HSTS, X-Frame-Options, CSP headers, rate limiting (100 req/min/IP) |
| **Performance** | gzip compression, SQLite pagination, in-memory preview/audio caching, ETag/Cache-Control |

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/sxw031/MarketFeed.git
cd MarketFeed
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory (optional — all defaults work out of the box):

```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/news.db
AUTO_SYNC_ENABLED=true
AUTO_SYNC_INTERVAL_MS=21600000
INITIAL_SYNC_ENABLED=false
ENABLE_EDGE_TTS=false
```

No API keys are required. All news sources are public. `ENABLE_EDGE_TTS=true` is optional and only needed if you want to enable the Python TTS path.

### 3. Start the application

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start

# Run the test suite
npm test
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
MarketFeed/
├── backend/
│   ├── server.js              # Main entry, AI chat, strategy endpoints
│   ├── routes/news.js         # API routing
│   ├── controllers/           # Request handlers
│   ├── services/
│   │   ├── newsAggregator.js  # News fetching, DB queries, fuzzy search
│   │   ├── webSearch.js       # Google/Bing/LinkedIn/Official scraping
│   │   ├── strategyEngine.js  # Report generation (rubric-aligned)
│   │   └── ttsService.js      # Text-to-speech (edge-tts + Google TTS)
│   ├── models/db.js           # SQLite setup, indexes, cleanup
│   └── config/sources.js      # Company registry & source config
├── frontend/
│   ├── index.html             # Main dashboard
│   ├── css/style.css          # Responsive styling
│   ├── js/app.js              # Frontend logic, pagination, rendering
│   ├── img/                   # Self-hosted logos
│   ├── robots.txt             # SEO
│   └── sitemap.xml            # SEO
├── package.json
├── .env.example
└── README.md
```

## Deployment on Render

1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository (`sxw031/MarketFeed`).
3. Configure:
   - **Runtime**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Environment Variables (optional):
   - `NODE_ENV`: `production`
   - `AUTO_SYNC_INTERVAL_MS`: `21600000`
   - `INITIAL_SYNC_ENABLED`: `false`
   - `ENABLE_EDGE_TTS`: `false`

No other environment variables are required. The default deployment path avoids Python setup during build and keeps cold starts lighter for small Render instances.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/news` | Fetch news (supports `limit`, `startDate`, `category`, `source`, `companies`, `search`) |
| GET | `/api/news/companies` | List tracked companies |
| GET | `/api/news/podcast` | Generate and stream daily podcast MP3 |
| POST | `/api/news/ai/chat` | AI chat assistant |
| POST | `/api/news/ai/strategy` | Generate strategy report (daily/weekly/monthly/quarterly) |
| POST | `/api/news/aggregate` | Trigger manual news aggregation |
| GET | `/api/news/aggregation-status` | Check aggregation progress |
| GET | `/api/health` | Health check |

## License

MIT License. Free for personal and commercial use.
