import { useState } from 'react'
import { portfolioAPI, BuyStockRequest } from '../lib/portfolio'

interface BuyStockModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userId: string
  availableBalance: number
  initialSymbol?: string
}

export default function BuyStockModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userId, 
  availableBalance, 
  initialSymbol = '' 
}: BuyStockModalProps) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalCost = parseFloat(quantity) * parseFloat(price) || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!symbol || !quantity || !price) {
      setError('All fields are required')
      return
    }

    if (totalCost > availableBalance) {
      setError('Insufficient balance')
      return
    }

    if (parseFloat(quantity) <= 0 || parseFloat(price) <= 0) {
      setError('Quantity and price must be positive')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const request: BuyStockRequest = {
        symbol: symbol.toUpperCase(),
        quantity: parseInt(quantity),
        price: parseFloat(price)
      }

      await portfolioAPI.buyStock(userId, request)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to buy stock')
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
            Buy Stock
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
            </div>

            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Number of shares"
                min="1"
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

            {totalCost > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Available Balance:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(availableBalance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Remaining Balance:</span>
                  <span className={`font-medium ${(availableBalance - totalCost) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(availableBalance - totalCost)}
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
                disabled={loading || totalCost > availableBalance || totalCost <= 0}
                className="flex-1 py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Buying...' : 'Buy Stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}