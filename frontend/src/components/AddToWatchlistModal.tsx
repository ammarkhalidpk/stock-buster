import { useState } from 'react'
import { watchlistAPI, AddToWatchlistRequest } from '../lib/watchlist'

interface AddToWatchlistModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userId: string
  initialSymbol?: string
}

export default function AddToWatchlistModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userId, 
  initialSymbol = '' 
}: AddToWatchlistModalProps) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!symbol) {
      setError('Stock symbol is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const request: AddToWatchlistRequest = {
        symbol: symbol.toUpperCase(),
        notes: notes || undefined
      }

      await watchlistAPI.addToWatchlist(userId, request)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to watchlist')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Add to Watchlist
          </h3>
          
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Stock Symbol
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., AAPL"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter a valid stock symbol
              </p>
            </div>

            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Why are you watching this stock?"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !symbol}
                className="flex-1 py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add to Watchlist'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}