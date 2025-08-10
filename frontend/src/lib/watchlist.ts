// Watchlist API utilities

export interface WatchlistItem {
  userId: string
  symbol: string
  addedAt: string
  notes?: string
  // Enriched data
  currentPrice?: number | null
  change?: number | null
  changePercent?: number | null
  volume?: number | null
  marketCap?: number | null
}

export interface AddToWatchlistRequest {
  symbol: string
  notes?: string
}

export const watchlistAPI = {
  async getWatchlist(userId: string): Promise<WatchlistItem[]> {
    const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/users/${userId}/watchlist`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get watchlist')
    }

    const result = await response.json()
    return result.data
  },

  async addToWatchlist(userId: string, request: AddToWatchlistRequest): Promise<WatchlistItem> {
    const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/users/${userId}/watchlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to add to watchlist')
    }

    const result = await response.json()
    return result.data
  },

  async removeFromWatchlist(userId: string, symbol: string): Promise<{ symbol: string }> {
    const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/users/${userId}/watchlist/${symbol}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to remove from watchlist')
    }

    const result = await response.json()
    return result.data
  },

  async updateWatchlistItem(userId: string, symbol: string, notes: string): Promise<WatchlistItem> {
    const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/users/${userId}/watchlist/${symbol}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update watchlist item')
    }

    const result = await response.json()
    return result.data
  }
}