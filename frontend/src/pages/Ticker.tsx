import { useState, useEffect } from 'react'
import { Bar, Forecast } from '../types'

export default function Ticker() {
  const [symbol, setSymbol] = useState('AAPL')
  const [bars, setBars] = useState<Bar[]>([])
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchTickerData = async (tickerSymbol: string) => {
    setLoading(true)
    try {
      // TODO: Replace with actual API calls
      const [barsResponse, forecastResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL_REST}/bars/${tickerSymbol}`),
        fetch(`${import.meta.env.VITE_API_URL_REST}/forecast/${tickerSymbol}`)
      ])
      
      const barsData = await barsResponse.json()
      const forecastData = await forecastResponse.json()
      
      setBars(barsData.data || [])
      setForecast(forecastData.data || null)
      setLastUpdate(new Date().toISOString())
    } catch (error) {
      console.error('Failed to fetch ticker data:', error)
      // Mock data for development
      setBars([
        { symbol: tickerSymbol, timestamp: new Date(Date.now() - 86400000).toISOString(), open: 178.20, high: 182.50, low: 177.80, close: 180.50, volume: 45000000 },
        { symbol: tickerSymbol, timestamp: new Date(Date.now() - 172800000).toISOString(), open: 175.30, high: 179.40, low: 174.90, close: 178.20, volume: 38000000 },
      ])
      setForecast({
        symbol: tickerSymbol,
        target: 195.00,
        confidence: 0.75,
        horizon: '30d',
        timestamp: new Date().toISOString()
      })
      setLastUpdate(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickerData(symbol)
  }, [symbol])

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const newSymbol = formData.get('symbol') as string
    if (newSymbol && newSymbol.trim()) {
      setSymbol(newSymbol.trim().toUpperCase())
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ticker Analysis</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Detailed view of stock performance and forecasts
        </p>
      </div>

      <div className="mb-6">
        <form onSubmit={handleSymbolSubmit} className="flex gap-4">
          <div className="flex-1 max-w-xs">
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Stock Symbol
            </label>
            <input
              type="text"
              name="symbol"
              id="symbol"
              defaultValue={symbol}
              placeholder="Enter symbol (e.g., AAPL)"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Analyze'}
            </button>
          </div>
        </form>
      </div>

      {lastUpdate && (
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Last updated: {new Date(lastUpdate).toLocaleString()}
          <span className="ml-2 text-xs text-amber-600">• Data may be delayed</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Price Bars */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Recent Price Data - {symbol}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Daily OHLC bars
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700">
            {loading ? (
              <div className="px-4 py-5 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : bars.length > 0 ? (
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Open</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">High</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Low</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Close</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bars.map((bar, index) => (
                    <tr key={index} className="bg-white dark:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(bar.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${bar.open.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        ${bar.high.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        ${bar.low.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${bar.close.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-5 text-center text-gray-500 dark:text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Forecast */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Price Forecast - {symbol}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              AI-generated price predictions
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5">
            {loading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : forecast ? (
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Target Price</dt>
                  <dd className="mt-1 text-2xl font-bold text-green-600">${forecast.target.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Confidence</dt>
                  <dd className="mt-1 text-2xl font-bold text-blue-600">{(forecast.confidence * 100).toFixed(0)}%</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Time Horizon</dt>
                  <dd className="mt-1 text-lg text-gray-900 dark:text-white">{forecast.horizon}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Generated</dt>
                  <dd className="mt-1 text-lg text-gray-900 dark:text-white">
                    {new Date(forecast.timestamp).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                No forecast available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}