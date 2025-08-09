import { useState, useEffect } from 'react'
import { Mover } from '../types'

export default function Dashboard() {
  const [movers, setMovers] = useState<Mover[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // TODO: Replace with actual API call
        const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/movers`)
        const data = await response.json()
        setMovers(data.data || [])
        setLastUpdate(new Date().toISOString())
      } catch (error) {
        console.error('Failed to fetch movers:', error)
        // Mock data for development
        setMovers([
          { symbol: 'AAPL', exchange: 'NASDAQ', sector: 'Technology', price: 180.50, change: 2.30, changePercent: 1.29, volume: 45000000, rank: 1, timestamp: new Date().toISOString() },
          { symbol: 'GOOGL', exchange: 'NASDAQ', sector: 'Technology', price: 2750.80, change: -15.20, changePercent: -0.55, volume: 1200000, rank: 2, timestamp: new Date().toISOString() },
        ])
        setLastUpdate(new Date().toISOString())
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading market data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Last updated: {new Date(lastUpdate).toLocaleString()} 
          <span className="ml-2 text-xs text-amber-600">• Data may be delayed</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">↗</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Top Gainer
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {movers.find(m => m.change > 0)?.symbol || 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">↘</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Top Loser
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {movers.find(m => m.change < 0)?.symbol || 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📊</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Active Stocks
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {movers.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Movers</h2>
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {movers.slice(0, 5).map((mover) => (
              <li key={mover.symbol} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {mover.symbol}
                    </div>
                    <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      ${mover.price.toFixed(2)}
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${mover.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {mover.change >= 0 ? '+' : ''}{mover.change.toFixed(2)} ({mover.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}