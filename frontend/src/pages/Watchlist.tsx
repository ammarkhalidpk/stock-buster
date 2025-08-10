import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { watchlistAPI, WatchlistItem } from '../lib/watchlist'
import AddToWatchlistModal from '../components/AddToWatchlistModal'

export default function Watchlist() {
  const { user } = useUser()
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchWatchlist = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      const watchlistData = await watchlistAPI.getWatchlist(user.userId)
      setWatchlist(watchlistData)
    } catch (err) {
      console.error('Failed to fetch watchlist:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch watchlist')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWatchlist()
  }, [user])

  const handleAddSuccess = () => {
    setShowAddModal(false)
    fetchWatchlist()
  }

  const handleRemove = async (symbol: string) => {
    if (!user) return

    if (window.confirm(`Are you sure you want to remove ${symbol} from your watchlist?`)) {
      try {
        await watchlistAPI.removeFromWatchlist(user.userId, symbol)
        fetchWatchlist()
      } catch (error) {
        console.error('Failed to remove from watchlist:', error)
        alert('Failed to remove from watchlist')
      }
    }
  }

  if (!user) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Please sign in to view your watchlist</h2>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading watchlist...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchWatchlist}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatVolume = (volume: number | null): string => {
    if (volume === null || volume === undefined) return 'N/A'
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`
    }
    return volume.toString()
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watchlist</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Keep track of stocks you're interested in
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Stock
            </button>
          </div>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {watchlist.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Change %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Volume
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {watchlist.map((item) => (
                    <tr key={item.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          to={`/stock/${item.symbol}`} 
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {item.symbol}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(item.currentPrice ?? null)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${(item.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.change !== null && item.change !== undefined ? 
                          `${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}` : 'N/A'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${(item.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.changePercent !== null && item.changePercent !== undefined ? 
                          `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatVolume(item.volume ?? null)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(item.addedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {item.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <button
                          onClick={() => handleRemove(item.symbol)}
                          className="text-red-600 hover:text-red-900 mr-2"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No watchlist items</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding stocks to your watchlist.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Your First Stock
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddToWatchlistModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
          userId={user.userId}
        />
      )}
    </div>
  )
}