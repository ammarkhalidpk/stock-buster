import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

interface StockData {
  symbol: string
  longName: string
  shortName: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  currency: string
  sector: string
  industry: string
  fullExchangeName: string
  marketCap?: number
  trailingPE?: number
  forwardPE?: number
  dividendYield?: number
  beta?: number
  fiftyTwoWeekLow?: number
  fiftyTwoWeekHigh?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketOpen?: number
  regularMarketPreviousClose?: number
  averageVolume?: number
  sharesOutstanding?: number
  bookValue?: number
  priceToBook?: number
  earningsPerShare?: number
  summaryDetail?: {
    previousClose?: number
    open?: number
    dayLow?: number
    dayHigh?: number
    fiftyTwoWeekLow?: number
    fiftyTwoWeekHigh?: number
    volume?: number
    averageVolume?: number
    marketCap?: number
    beta?: number
    trailingPE?: number
    forwardPE?: number
    dividendYield?: number
    dividendRate?: number
    payoutRatio?: number
  }
  financialData?: {
    totalCash?: number
    totalDebt?: number
    totalRevenue?: number
    grossProfits?: number
    operatingCashflow?: number
    freeCashflow?: number
    returnOnAssets?: number
    returnOnEquity?: number
    debtToEquity?: number
    currentRatio?: number
    quickRatio?: number
    revenueGrowth?: number
    earningsGrowth?: number
  }
}

export default function StockDetails() {
  const { symbol } = useParams<{ symbol: string }>()
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStockData = async () => {
      if (!symbol) return
      
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/stock/${symbol.toUpperCase()}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data for ${symbol}`)
        }
        
        const data = await response.json()
        setStockData(data.data)
      } catch (err) {
        console.error('Error fetching stock data:', err)
        setError(`Failed to load data for ${symbol}`)
      } finally {
        setLoading(false)
      }
    }

    fetchStockData()
  }, [symbol])

  const formatNumber = (value?: number | null, decimals: number = 2): string => {
    if (value === null || value === undefined) return 'N/A'
    return value.toFixed(decimals)
  }

  const formatLargeNumber = (value?: number | null): string => {
    if (value === null || value === undefined) return 'N/A'
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  const formatPercent = (value?: number | null): string => {
    if (value === null || value === undefined) return 'N/A'
    return `${(value * 100).toFixed(2)}%`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading {symbol} data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !stockData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Error</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{error || 'Stock not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6 sm:px-0">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {stockData.longName || stockData.shortName} ({stockData.symbol})
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {stockData.fullExchangeName} • {stockData.sector} • {stockData.industry}
              </p>
            </div>
          </div>

          {/* Price Info */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.regularMarketPrice)}
                </div>
                <div className={`text-lg font-semibold mt-1 ${
                  stockData.regularMarketChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stockData.regularMarketChange >= 0 ? '+' : ''}{formatNumber(stockData.regularMarketChange)} ({formatNumber(stockData.regularMarketChangePercent)}%)
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Volume: {stockData.regularMarketVolume?.toLocaleString() || 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Market Cap: {formatLargeNumber(stockData.marketCap)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'financials', name: 'Financials' },
                { id: 'statistics', name: 'Statistics' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Key Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">P/E Ratio (TTM)</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatNumber(stockData.trailingPE)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Forward P/E</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatNumber(stockData.forwardPE)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">P/B Ratio</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatNumber(stockData.priceToBook)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dividend Yield</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPercent(stockData.dividendYield)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Beta</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatNumber(stockData.beta)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">EPS (TTM)</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.earningsPerShare)}</span>
                </div>
              </div>
            </div>

            {/* Trading Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Trading Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Previous Close</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.regularMarketPreviousClose)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Open</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.regularMarketOpen)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Day Range</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.regularMarketDayLow)} - {stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.regularMarketDayHigh)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">52 Week Range</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.fiftyTwoWeekLow)} - {stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.fiftyTwoWeekHigh)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Volume</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stockData.regularMarketVolume?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg Volume</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stockData.averageVolume?.toLocaleString() || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Valuation Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Valuation</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Market Cap</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatLargeNumber(stockData.marketCap)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Shares Outstanding</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stockData.sharesOutstanding ? (stockData.sharesOutstanding / 1e9).toFixed(2) + 'B' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Book Value</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.bookValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dividend Rate</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.summaryDetail?.dividendRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Payout Ratio</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPercent(stockData.summaryDetail?.payoutRatio)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue & Profitability */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue & Profitability</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Revenue</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatLargeNumber(stockData.financialData?.totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Gross Profits</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatLargeNumber(stockData.financialData?.grossProfits)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Revenue Growth</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPercent(stockData.financialData?.revenueGrowth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Earnings Growth</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPercent(stockData.financialData?.earningsGrowth)}</span>
                </div>
              </div>
            </div>

            {/* Balance Sheet */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Balance Sheet</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Cash</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatLargeNumber(stockData.financialData?.totalCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Debt</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatLargeNumber(stockData.financialData?.totalDebt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current Ratio</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatNumber(stockData.financialData?.currentRatio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Debt to Equity</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatNumber(stockData.financialData?.debtToEquity)}</span>
                </div>
              </div>
            </div>

            {/* Cash Flow */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cash Flow</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Operating Cash Flow</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatLargeNumber(stockData.financialData?.operatingCashflow)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Free Cash Flow</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatLargeNumber(stockData.financialData?.freeCashflow)}</span>
                </div>
              </div>
            </div>

            {/* Returns */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Returns</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Return on Assets</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPercent(stockData.financialData?.returnOnAssets)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Return on Equity</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPercent(stockData.financialData?.returnOnEquity)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Valuation Measures</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Market Cap</span>
                    <span className="text-gray-900 dark:text-white">{formatLargeNumber(stockData.marketCap)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">P/E Ratio</span>
                    <span className="text-gray-900 dark:text-white">{formatNumber(stockData.trailingPE)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">P/B Ratio</span>
                    <span className="text-gray-900 dark:text-white">{formatNumber(stockData.priceToBook)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Trading Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Beta</span>
                    <span className="text-gray-900 dark:text-white">{formatNumber(stockData.beta)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">52W High</span>
                    <span className="text-gray-900 dark:text-white">{stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.fiftyTwoWeekHigh)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">52W Low</span>
                    <span className="text-gray-900 dark:text-white">{stockData.currency === 'USD' ? '$' : stockData.currency + ' '}{formatNumber(stockData.fiftyTwoWeekLow)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Share Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Shares Outstanding</span>
                    <span className="text-gray-900 dark:text-white">{stockData.sharesOutstanding ? (stockData.sharesOutstanding / 1e9).toFixed(2) + 'B' : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Avg Volume</span>
                    <span className="text-gray-900 dark:text-white">{stockData.averageVolume?.toLocaleString() || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}