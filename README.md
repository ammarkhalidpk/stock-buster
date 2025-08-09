# Stock Buster

A minimal monorepo for stock market analysis with React frontend and AWS serverless backend.

## Architecture

```
stock-buster/
├── package.json                    # Root workspace config
├── frontend/                       # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/                 # Dashboard, Movers, Ticker
│   │   ├── components/            # Shared components
│   │   └── types/                 # TypeScript interfaces
│   └── tests/                     # Vitest unit tests
└── infra/                         # AWS SAM + Node 20 Lambdas
    ├── src/
    │   ├── handlers/              # REST + WebSocket handlers
    │   └── types/                 # Shared types
    ├── template.yaml              # SAM template
    └── tests/                     # Jest unit tests
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run frontend locally:**
   ```bash
   npm run dev
   ```

3. **Deploy infrastructure:**
   ```bash
   cd infra
   npm run deploy
   ```

## API Endpoints

### REST API
- `GET /movers` - Market movers with optional filters
- `GET /bars/{symbol}` - OHLC bars (daily/intraday)  
- `GET /forecast/{symbol}` - Price forecasts

### WebSocket
- Connect/disconnect for real-time data
- Subscribe to market movers or specific tickers
- Message-based communication

## DynamoDB Tables

| Table | Purpose | Keys |
|-------|---------|------|
| BarsDaily | Daily OHLC data | symbol (PK), date (SK) |
| BarsIntraday | Intraday bars | symbol (PK), timestamp (SK) |
| Movers | Market movers | id (PK), timestamp (SK) |
| Forecasts | AI predictions | symbol (PK), horizon (SK) |
| Metadata | WebSocket connections | key (PK) |

## Development

### Frontend
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production  
npm run test         # Run tests
npm run lint         # Lint code
```

### Infrastructure
```bash
cd infra
npm run build        # Compile TypeScript
npm run test         # Run tests
npm run local        # Start SAM local API
npm run deploy       # Deploy to AWS
```

## Environment Setup

### AWS Amplify Hosting

1. **Connect Repository:**
   ```bash
   # Push to GitHub/GitLab/Bitbucket
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Create Amplify App:**
   - Go to AWS Amplify Console
   - Connect your repository
   - Amplify will auto-detect `amplify.yml`

3. **Configure Environment Variables:**
   ```
   VITE_API_URL_REST=https://your-api-gateway.execute-api.us-east-1.amazonaws.com/prod
   VITE_API_URL_WS=wss://your-websocket.execute-api.us-east-1.amazonaws.com/prod
   ```

4. **Deploy Infrastructure First:**
   ```bash
   cd infra
   npm run deploy
   # Copy output URLs to Amplify environment variables
   ```

### Local Development (.env)
```
VITE_API_URL_REST=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
VITE_API_URL_WS=wss://your-websocket-url.execute-api.us-east-1.amazonaws.com/prod
```

### PR Preview Environments

Amplify automatically creates preview environments for pull requests:

- **Feature Branch:** `https://feature-branch.<app-id>.amplifyapp.com`
- **PR Preview:** `https://pr-123.<app-id>.amplifyapp.com`
- **Main Branch:** `https://main.<app-id>.amplifyapp.com`

Each environment uses the same backend infrastructure but can have different environment variables if needed.

### Infrastructure (AWS SAM)
- Auto-configured via SAM template
- DynamoDB table names
- WebSocket API endpoint
- Outputs API URLs for frontend configuration

## Features

- **📊 Dashboard:** Market overview with top movers
- **📈 Movers:** Filterable gainers/losers table
- **🎯 Ticker:** Individual stock analysis with forecasts
- **⚡ Real-time:** WebSocket subscriptions
- **🌙 Dark Mode:** CSS-based theme switching
- **♿ Accessible:** ARIA labels and semantic HTML
- **📱 Responsive:** Mobile-first design
- **🧪 Tested:** Unit tests for frontend and backend

## Mock Data

All endpoints return mock data when no real data exists, enabling development without external data providers.

## Deployment

1. Configure AWS credentials
2. Run `npm run deploy` in infra/
3. Update frontend .env with API URLs
4. Deploy frontend to your hosting platform

## License

MIT

## 🚀 Live Demo

Frontend: https://main.dyb9cmabiux6t.amplifyapp.com
API: https://9nzf05a233.execute-api.ap-southeast-2.amazonaws.com/dev/