// Portfolio API utilities

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

export interface PortfolioSummary {
  totalValue: number
  totalInvested: number
  totalProfitLoss: number
  totalProfitLossPercent: number
  availableBalance: number
  positions: Portfolio[]
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

export const portfolioAPI = {
  async getPortfolio(userId: string): Promise<PortfolioSummary> {
    const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/users/${userId}/portfolio`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get portfolio')
    }

    const result = await response.json()
    return result.data
  },

  async buyStock(userId: string, request: BuyStockRequest): Promise<{ transactionId: string }> {
    const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/users/${userId}/portfolio/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to buy stock')
    }

    const result = await response.json()
    return result.data
  },

  async sellStock(userId: string, request: SellStockRequest): Promise<{ transactionId: string; profitLoss: number }> {
    const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/users/${userId}/portfolio/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to sell stock')
    }

    const result = await response.json()
    return result.data
  },

  async getTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
    const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/users/${userId}/transactions?limit=${limit}`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get transactions')
    }

    const result = await response.json()
    return result.data
  }
}

// Utility functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export const formatPercentage = (percentage: number): string => {
  const sign = percentage >= 0 ? '+' : ''
  return `${sign}${percentage.toFixed(2)}%`
}

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num)
}