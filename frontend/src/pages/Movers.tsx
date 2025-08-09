import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mover } from '../types'

export default function Movers() {
  const [movers, setMovers] = useState<Mover[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all')
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    const fetchMovers = async () => {
      setLoading(true)
      try {
        // TODO: Replace with actual API call
        const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/movers`)
        const data = await response.json()
        // Filter out items with null prices
        const validMovers = (data.data || []).filter((m: Mover) => m.price !== null && m.price !== undefined)
        setMovers(validMovers)
        setLastUpdate(new Date().toISOString())
      } catch (error) {
        console.error('Failed to fetch movers:', error)
        // Mock data for development
        setMovers([
          { symbol: 'AAPL', exchange: 'NASDAQ', sector: 'Technology', price: 180.50, change: 2.30, changePercent: 1.29, volume: 45000000, rank: 1, timestamp: new Date().toISOString() },
          { symbol: 'MSFT', exchange: 'NASDAQ', sector: 'Technology', price: 420.75, change: 8.50, changePercent: 2.06, volume: 32000000, rank: 2, timestamp: new Date().toISOString() },
          { symbol: 'GOOGL', exchange: 'NASDAQ', sector: 'Technology', price: 2750.80, change: -15.20, changePercent: -0.55, volume: 1200000, rank: 3, timestamp: new Date().toISOString() },
          { symbol: 'TSLA', exchange: 'NASDAQ', sector: 'Automotive', price: 245.30, change: -12.80, changePercent: -4.96, volume: 89000000, rank: 4, timestamp: new Date().toISOString() },
        ])
        setLastUpdate(new Date().toISOString())
      } finally {
        setLoading(false)
      }
    }

    fetchMovers()
    const interval = setInterval(fetchMovers, 30000)
    return () => clearInterval(interval)
  }, [])

  const filteredMovers = movers.filter(mover => {
    if (filter === 'gainers') return mover.change > 0
    if (filter === 'losers') return mover.change < 0
    return true
  })

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading market movers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Market Movers</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Last updated: {new Date(lastUpdate).toLocaleString()}
          <span className="ml-2 text-xs text-amber-600">• Data may be delayed</span>
        </p>
      </div>

      <div className="mb-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing {filteredMovers.length} stocks
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'gainers' | 'losers')}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Movers</option>
              <option value="gainers">Gainers Only</option>
              <option value="losers">Losers Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Symbol
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Change
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Change %
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Volume
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredMovers.map((mover) => (
              <tr key={mover.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link to={`/stock/${mover.symbol}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    {mover.symbol}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  ${mover.price?.toFixed(2) || '0.00'}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${mover.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {mover.change >= 0 ? '+' : ''}{mover.change?.toFixed(2) || '0.00'}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${mover.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {mover.changePercent >= 0 ? '+' : ''}{mover.changePercent?.toFixed(2) || '0.00'}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {mover.volume?.toLocaleString() || '0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}