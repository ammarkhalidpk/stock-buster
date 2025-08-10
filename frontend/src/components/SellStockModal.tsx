import { useState } from 'react'
import { portfolioAPI, SellStockRequest, Portfolio } from '../lib/portfolio'

interface SellStockModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userId: string
  symbol: string
  position?: Portfolio
}

export default function SellStockModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userId, 
  symbol,
  position
}: SellStockModalProps) {
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalProceeds = parseFloat(quantity) * parseFloat(price) || 0
  const maxQuantity = position?.quantity || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!quantity || !price) {
      setError('All fields are required')
      return
    }

    const sellQuantity = parseInt(quantity)
    if (sellQuantity > maxQuantity) {
      setError(`Cannot sell more than ${maxQuantity} shares`)
      return
    }

    if (sellQuantity <= 0 || parseFloat(price) <= 0) {
      setError('Quantity and price must be positive')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const request: SellStockRequest = {
        symbol: symbol.toUpperCase(),
        quantity: sellQuantity,
        price: parseFloat(price)
      }

      await portfolioAPI.sellStock(userId, request)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sell stock')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Sell {symbol}
          </h3>
          
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-left">
              <div className="text-sm text-gray-600 dark:text-gray-400">Current Position:</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {maxQuantity} shares @ {position ? formatCurrency(position.averagePrice) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Investment: {position ? formatCurrency(position.totalInvested) : 'N/A'}
              </div>
            </div>

            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantity to Sell
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Max: ${maxQuantity} shares`}
                min="1"
                max={maxQuantity}
                required
              />
            </div>

            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price per Share
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Current market price"
                min="0.01"
                required
              />
            </div>

            {totalProceeds > 0 && position && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Proceeds:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(totalProceeds)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Cost Basis:</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(position.averagePrice * parseInt(quantity || '0'))}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Estimated P&L:</span>
                  <span className={`font-medium ${
                    (totalProceeds - position.averagePrice * parseInt(quantity || '0')) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(totalProceeds - position.averagePrice * parseInt(quantity || '0'))}
                  </span>
                </div>
              </div>
            )}

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
                disabled={loading || parseInt(quantity || '0') > maxQuantity || parseInt(quantity || '0') <= 0}
                className="flex-1 py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Selling...' : 'Sell Stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}