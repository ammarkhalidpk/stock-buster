// User Management Types

export interface User {
  userId: string
  email: string
  firstName?: string
  lastName?: string
  virtualBalance: number
  createdAt: string
  updatedAt: string
  cognitoUserId: string
}

export interface Portfolio {
  userId: string
  symbol: string
  quantity: number
  averagePrice: number
  totalInvested: number
  currentValue?: number
  profitLoss?: number
  profitLossPercent?: number
  lastUpdated: string
}

export interface Transaction {
  userId: string
  transactionId: string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  totalAmount: number
  timestamp: string
  ttl?: number // 30 days from creation
}

export interface WatchlistItem {
  userId: string
  symbol: string
  addedAt: string
  notes?: string
}

export interface BuyStockRequest {
  symbol: string
  quantity: number
  price: number
}

export interface SellStockRequest {
  symbol: string
  quantity: number
  price: number
}

export interface CreateUserRequest {
  email: string
  firstName?: string
  lastName?: string
  cognitoUserId: string
}

export interface AddToWatchlistRequest {
  symbol: string
  notes?: string
}

// Portfolio Summary
export interface PortfolioSummary {
  totalValue: number
  totalInvested: number
  totalProfitLoss: number
  totalProfitLossPercent: number
  availableBalance: number
  positions: Portfolio[]
}

// Historical Performance Data (for 1-month tracking)
export interface PortfolioHistoryEntry {
  userId: string
  date: string // YYYY-MM-DD
  totalValue: number
  totalInvested: number
  profitLoss: number
  profitLossPercent: number
  timestamp: string
}

// Response types
export interface ApiResponse<T> {
  data: T
  message: string
  timestamp: string
  source: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    hasMore: boolean
    nextCursor?: string
    limit: number
    count: number
  }
}