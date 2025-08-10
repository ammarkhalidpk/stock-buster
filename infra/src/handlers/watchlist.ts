import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { ApiHandler, createResponse, createErrorResponse } from '../types/index'
import { WatchlistItem, AddToWatchlistRequest } from '../types/user'
import { YahooFinanceService } from '../services/yahooFinance'

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

export const getWatchlist: ApiHandler = async (event) => {
  console.log('GET /users/{userId}/watchlist request:', JSON.stringify(event, null, 2))

  try {
    const tableName = process.env.WATCHLISTS_TABLE
    if (!tableName) {
      throw new Error('WATCHLISTS_TABLE environment variable not set')
    }

    const userId = event.pathParameters?.userId
    if (!userId) {
      return createErrorResponse(400, 'userId path parameter is required')
    }

    // Get watchlist items
    const response = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }))

    const watchlistItems = (response.Items || []) as WatchlistItem[]

    // Enrich with current stock data
    const enrichedWatchlist = []
    
    for (const item of watchlistItems) {
      try {
        const stockData = await YahooFinanceService.getQuote(item.symbol)
        enrichedWatchlist.push({
          ...item,
          currentPrice: stockData?.regularMarketPrice || null,
          change: stockData?.regularMarketChange || null,
          changePercent: stockData?.regularMarketChangePercent || null,
          volume: stockData?.regularMarketVolume || null,
          marketCap: stockData?.marketCap || null
        })
      } catch (error) {
        console.warn(`Failed to get price for watchlist item ${item.symbol}:`, error)
        enrichedWatchlist.push({
          ...item,
          currentPrice: null,
          change: null,
          changePercent: null,
          volume: null,
          marketCap: null
        })
      }
    }

    return createResponse(200, enrichedWatchlist, 'Watchlist retrieved successfully')

  } catch (error) {
    console.error('Error getting watchlist:', error)
    return createErrorResponse(500, 'Failed to get watchlist', error)
  }
}

export const addToWatchlist: ApiHandler = async (event) => {
  console.log('POST /users/{userId}/watchlist request:', JSON.stringify(event, null, 2))

  try {
    const tableName = process.env.WATCHLISTS_TABLE
    if (!tableName) {
      throw new Error('WATCHLISTS_TABLE environment variable not set')
    }

    const userId = event.pathParameters?.userId
    if (!userId) {
      return createErrorResponse(400, 'userId path parameter is required')
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required')
    }

    const request: AddToWatchlistRequest = JSON.parse(event.body)
    
    if (!request.symbol) {
      return createErrorResponse(400, 'Symbol is required')
    }

    // Validate symbol by trying to get quote
    try {
      const stockData = await YahooFinanceService.getQuote(request.symbol.toUpperCase())
      if (!stockData) {
        return createErrorResponse(400, `Invalid stock symbol: ${request.symbol}`)
      }
    } catch (error) {
      return createErrorResponse(400, `Unable to find stock data for symbol: ${request.symbol}`)
    }

    const now = new Date().toISOString()

    const watchlistItem: WatchlistItem = {
      userId,
      symbol: request.symbol.toUpperCase(),
      addedAt: now,
      notes: request.notes
    }

    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: watchlistItem,
      ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(symbol)'
    }))

    return createResponse(201, watchlistItem, 'Stock added to watchlist successfully')

  } catch (error) {
    console.error('Error adding to watchlist:', error)
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return createErrorResponse(409, 'Stock already exists in watchlist')
    }
    return createErrorResponse(500, 'Failed to add stock to watchlist', error)
  }
}

export const removeFromWatchlist: ApiHandler = async (event) => {
  console.log('DELETE /users/{userId}/watchlist/{symbol} request:', JSON.stringify(event, null, 2))

  try {
    const tableName = process.env.WATCHLISTS_TABLE
    if (!tableName) {
      throw new Error('WATCHLISTS_TABLE environment variable not set')
    }

    const userId = event.pathParameters?.userId
    const symbol = event.pathParameters?.symbol

    if (!userId) {
      return createErrorResponse(400, 'userId path parameter is required')
    }

    if (!symbol) {
      return createErrorResponse(400, 'symbol path parameter is required')
    }

    // Check if item exists
    const existingItem = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { userId, symbol: symbol.toUpperCase() }
    }))

    if (!existingItem.Item) {
      return createErrorResponse(404, 'Stock not found in watchlist')
    }

    // Remove from watchlist
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: { userId, symbol: symbol.toUpperCase() }
    }))

    return createResponse(200, { symbol: symbol.toUpperCase() }, 'Stock removed from watchlist successfully')

  } catch (error) {
    console.error('Error removing from watchlist:', error)
    return createErrorResponse(500, 'Failed to remove stock from watchlist', error)
  }
}

export const updateWatchlistItem: ApiHandler = async (event) => {
  console.log('PUT /users/{userId}/watchlist/{symbol} request:', JSON.stringify(event, null, 2))

  try {
    const tableName = process.env.WATCHLISTS_TABLE
    if (!tableName) {
      throw new Error('WATCHLISTS_TABLE environment variable not set')
    }

    const userId = event.pathParameters?.userId
    const symbol = event.pathParameters?.symbol

    if (!userId || !symbol) {
      return createErrorResponse(400, 'userId and symbol path parameters are required')
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required')
    }

    const { notes } = JSON.parse(event.body)

    // Check if item exists
    const existingItem = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { userId, symbol: symbol.toUpperCase() }
    }))

    if (!existingItem.Item) {
      return createErrorResponse(404, 'Stock not found in watchlist')
    }

    // Update the item
    const updatedItem = {
      ...existingItem.Item,
      notes: notes || null
    }

    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: updatedItem
    }))

    return createResponse(200, updatedItem, 'Watchlist item updated successfully')

  } catch (error) {
    console.error('Error updating watchlist item:', error)
    return createErrorResponse(500, 'Failed to update watchlist item', error)
  }
}