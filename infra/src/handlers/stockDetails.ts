import { ApiHandler, createResponse, createErrorResponse } from '../types/index'
import { YahooFinanceService } from '../services/yahooFinance'

export const handler: ApiHandler = async (event) => {
  console.log('GET /stock/{symbol} request:', JSON.stringify(event, null, 2))

  try {
    const symbol = event.pathParameters?.symbol?.toUpperCase()
    if (!symbol) {
      return createErrorResponse(400, 'Symbol path parameter is required')
    }

    console.log(`Fetching detailed data for ${symbol}`)
    
    // Get detailed stock data from Yahoo Finance
    const stockData = await YahooFinanceService.getDetailedStockData(symbol)
    
    if (!stockData) {
      return createErrorResponse(404, `Stock data not found for symbol: ${symbol}`)
    }

    return createResponse(200, stockData, `Detailed stock data for ${symbol} retrieved successfully`)

  } catch (error) {
    console.error('Error fetching stock details:', error)
    return createErrorResponse(500, 'Failed to fetch stock details', error)
  }
}