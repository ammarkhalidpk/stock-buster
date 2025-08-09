import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Mover } from '../types'

interface ApiResponse {
  data: Mover[]
  pagination: {
    hasMore: boolean
    nextCursor: string | null
    limit: number
    count: number
  }
  filters: {
    exchange: string
    period: string
    sector?: string
    sortBy: string
    gainersOnly: boolean
    losersOnly: boolean
  }
}

const MARKETS = [
  { value: 'NASDAQ', label: 'NASDAQ', flag: '🇺🇸' },
  { value: 'NYSE', label: 'NYSE', flag: '🇺🇸' },
  { value: 'ASX', label: 'ASX', flag: '🇦🇺' },
  { value: 'LSE', label: 'LSE', flag: '🇬🇧' },
  { value: 'TSE', label: 'TSE', flag: '🇨🇦' },
  { value: 'ALL', label: 'All Markets', flag: '🌍' }
]

export default function Dashboard() {
  const [movers, setMovers] = useState<Mover[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<string>('NASDAQ')
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const observer = useRef<IntersectionObserver | null>(null)
  const lastStockElementRef = useCallback((node: HTMLTableRowElement | null) => {
    if (loading || loadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreStocks()
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, loadingMore, hasMore])

  const fetchStocks = async (market: string, cursor: string | null = null, append: boolean = false) => {
    try {
      setError(null)
      const params = new URLSearchParams({
        exchange: market,
        period: 'INTRADAY',
        sortBy: 'performance',
        limit: '50'
      })
      
      if (cursor) {
        params.append('cursor', cursor)
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/movers?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result: { data: ApiResponse } = await response.json()
      const apiData = result.data
      
      // Filter out items with null prices and sort by performance (highest first)
      const validMovers = apiData.data
        .filter((m: Mover) => m.price !== null && m.price !== undefined)
        .sort((a: Mover, b: Mover) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      
      if (append) {
        setMovers(prev => [...prev, ...validMovers])
      } else {
        setMovers(validMovers)
      }
      
      setHasMore(apiData.pagination.hasMore)
      setNextCursor(apiData.pagination.nextCursor)
      setLastUpdate(new Date().toISOString())
      
    } catch (error) {
      console.error('Failed to fetch stocks:', error)
      setError('Failed to load stock data. Please try again.')
      
      // Fallback mock data for development
      if (!append) {
        const mockData = generateMockData(market)
        setMovers(mockData)
        setHasMore(false)
        setLastUpdate(new Date().toISOString())
      }
    }
  }

  const loadMoreStocks = useCallback(() => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    fetchStocks(selectedMarket, nextCursor, true).finally(() => {
      setLoadingMore(false)
    })
  }, [selectedMarket, nextCursor, hasMore, loadingMore])

  useEffect(() => {
    setLoading(true)
    setMovers([])
    setNextCursor(null)
    setHasMore(true)
    fetchStocks(selectedMarket).finally(() => {
      setLoading(false)
    })
  }, [selectedMarket])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !loadingMore) {
        fetchStocks(selectedMarket)
      }
    }, 120000)
    return () => clearInterval(interval)
  }, [selectedMarket, loading, loadingMore])

  const generateMockData = (market: string): Mover[] => {
    const baseStocks = market === 'ASX' 
      ? [
          { symbol: 'BHP.AX', sector: 'Materials', price: 45.20 },
          { symbol: 'CBA.AX', sector: 'Financials', price: 102.50 },
          { symbol: 'CSL.AX', sector: 'Healthcare', price: 275.80 },
          { symbol: 'WES.AX', sector: 'Consumer Staples', price: 58.45 }
        ]
      : [
          { symbol: 'AAPL', sector: 'Technology', price: 180.50 },
          { symbol: 'GOOGL', sector: 'Technology', price: 2750.80 },
          { symbol: 'MSFT', sector: 'Technology', price: 420.75 },
          { symbol: 'TSLA', sector: 'Automotive', price: 245.30 }
        ]

    return baseStocks.map((stock, index) => ({
      ...stock,
      exchange: market,
      change: (Math.random() - 0.5) * 20,
      changePercent: (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 50000000) + 1000000,
      rank: index + 1,
      timestamp: new Date().toISOString()
    }))
  }

  const topGainer = movers.find(m => m.changePercent > 0) || movers[0]
  const topLoser = movers.find(m => m.changePercent < 0) || movers[1]
  const currentMarket = MARKETS.find(m => m.value === selectedMarket) || MARKETS[0]

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading {currentMarket.label} stocks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header with Market Selector */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentMarket.flag} {currentMarket.label} Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Last updated: {new Date(lastUpdate).toLocaleString()}
              <span className="ml-2 text-xs text-amber-600">• Live data • Sorted by performance</span>
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              {MARKETS.map(market => (
                <option key={market.value} value={market.value}>
                  {market.flag} {market.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
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
                    {topGainer?.symbol || 'N/A'}
                  </dd>
                  <dd className="text-sm text-green-600 font-medium">
                    +{topGainer?.changePercent?.toFixed(2) || '0.00'}%
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
                    {topLoser?.symbol || 'N/A'}
                  </dd>
                  <dd className="text-sm text-red-600 font-medium">
                    {topLoser?.changePercent?.toFixed(2) || '0.00'}%
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
                  <span className="text-white text-sm font-bold">📈</span>
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
                  <dd className="text-sm text-gray-500">
                    {movers.filter(m => m.changePercent > 0).length} gainers
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
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📊</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Avg Volume
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {movers.length > 0 ? 
                      (movers.reduce((sum, m) => sum + (m.volume || 0), 0) / movers.length / 1000000).toFixed(1) + 'M'
                      : '0M'
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stocks List with Infinite Scroll */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Highest Performing Stocks
          </h2>
          
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
                    Sector
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {movers.map((mover, index) => (
                  <tr 
                    key={`${mover.symbol}-${index}`}
                    ref={index === movers.length - 1 ? lastStockElementRef : null}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        to={`/stock/${mover.symbol}`} 
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
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
                      {mover.volume ? (mover.volume / 1000000).toFixed(1) + 'M' : '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {mover.sector}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="text-center py-4">
              <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100">
                <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                Loading more stocks...
              </div>
            </div>
          )}

          {/* No More Data Indicator */}
          {!hasMore && movers.length > 0 && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              Showing all {movers.length} stocks for {currentMarket.label}
            </div>
          )}

          {/* Empty State */}
          {movers.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No stocks found for {currentMarket.label}. Market may be closed or data unavailable.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}