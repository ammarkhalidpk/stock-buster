import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { portfolioAPI, PortfolioSummary, formatCurrency, formatPercentage } from '../lib/portfolio'
import BuyStockModal from '../components/BuyStockModal'
import SellStockModal from '../components/SellStockModal'

export default function Portfolio() {
  const { user } = useUser()
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showSellModal, setShowSellModal] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')

  const fetchPortfolio = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      const portfolioData = await portfolioAPI.getPortfolio(user.userId)
      setPortfolio(portfolioData)
    } catch (err) {
      console.error('Failed to fetch portfolio:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolio()
  }, [user])

  const handleBuySuccess = () => {
    setShowBuyModal(false)
    fetchPortfolio()
  }

  const handleSellSuccess = () => {
    setShowSellModal(false)
    fetchPortfolio()
  }

  const handleSell = (symbol: string) => {
    setSelectedSymbol(symbol)
    setShowSellModal(true)
  }

  if (!user) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Please sign in to view your portfolio</h2>
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
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading portfolio...</p>
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
            onClick={fetchPortfolio}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track your virtual investments and performance
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowBuyModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Buy Stock
            </button>
          </div>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">💰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Portfolio Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {portfolio ? formatCurrency(portfolio.totalValue) : '$0.00'}
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
                  <span className="text-white text-sm font-bold">💳</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Available Balance
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {portfolio ? formatCurrency(portfolio.availableBalance) : '$0.00'}
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
                <div className={`w-8 h-8 ${portfolio && portfolio.totalProfitLoss >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full flex items-center justify-center`}>
                  <span className="text-white text-sm font-bold">
                    {portfolio && portfolio.totalProfitLoss >= 0 ? '📈' : '📉'}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total P&L
                  </dt>
                  <dd className={`text-lg font-medium ${portfolio && portfolio.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolio ? formatCurrency(portfolio.totalProfitLoss) : '$0.00'}
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
                  <span className="text-white text-sm font-bold">%</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    P&L Percentage
                  </dt>
                  <dd className={`text-lg font-medium ${portfolio && portfolio.totalProfitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolio ? formatPercentage(portfolio.totalProfitLossPercent) : '0.00%'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Holdings</h2>
          
          {portfolio && portfolio.positions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Avg Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      P&L
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {portfolio.positions.map((position) => (
                    <tr key={position.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          to={`/stock/${position.symbol}`} 
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {position.symbol}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {position.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(position.averagePrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(position.currentValue || 0)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${(position.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(position.profitLoss || 0)} ({formatPercentage(position.profitLossPercent || 0)})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <button
                          onClick={() => handleSell(position.symbol)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No holdings yet. Start investing to see your portfolio here.
              </p>
              <button
                onClick={() => setShowBuyModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Buy Your First Stock
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showBuyModal && (
        <BuyStockModal
          isOpen={showBuyModal}
          onClose={() => setShowBuyModal(false)}
          onSuccess={handleBuySuccess}
          userId={user.userId}
          availableBalance={portfolio?.availableBalance || 0}
        />
      )}

      {showSellModal && selectedSymbol && portfolio && (
        <SellStockModal
          isOpen={showSellModal}
          onClose={() => setShowSellModal(false)}
          onSuccess={handleSellSuccess}
          userId={user.userId}
          symbol={selectedSymbol}
          position={portfolio.positions.find(p => p.symbol === selectedSymbol)}
        />
      )}
    </div>
  )
}