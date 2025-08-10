import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb'
import { ApiHandler, createResponse, createErrorResponse } from '../types/index'
import { Portfolio, Transaction, BuyStockRequest, SellStockRequest, PortfolioSummary, User } from '../types/user'
import { YahooFinanceService } from '../services/yahooFinance'
import { v4 as uuidv4 } from 'uuid'

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

export const getPortfolio: ApiHandler = async (event) => {
  console.log('GET /users/{userId}/portfolio request:', JSON.stringify(event, null, 2))

  try {
    const portfolioTable = process.env.PORTFOLIOS_TABLE
    const usersTable = process.env.USERS_TABLE
    
    if (!portfolioTable || !usersTable) {
      throw new Error('Required environment variables not set')
    }

    const userId = event.pathParameters?.userId
    if (!userId) {
      return createErrorResponse(400, 'userId path parameter is required')
    }

    // Get user to get virtual balance
    const userResponse = await docClient.send(new GetCommand({
      TableName: usersTable,
      Key: { userId }
    }))

    if (!userResponse.Item) {
      return createErrorResponse(404, 'User not found')
    }

    const user = userResponse.Item as User

    // Get portfolio positions
    const portfolioResponse = await docClient.send(new QueryCommand({
      TableName: portfolioTable,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }))

    const positions = (portfolioResponse.Items || []) as Portfolio[]

    // Get current prices for all positions
    const symbols = positions.map(p => p.symbol)
    let totalCurrentValue = 0
    let totalInvested = 0

    if (symbols.length > 0) {
      // Update positions with current prices
      for (const position of positions) {
        try {
          const stockData = await YahooFinanceService.getQuote(position.symbol)
          if (stockData) {
            position.currentValue = stockData.regularMarketPrice * position.quantity
            position.profitLoss = position.currentValue - position.totalInvested
            position.profitLossPercent = (position.profitLoss / position.totalInvested) * 100
          } else {
            // Use last known average price if quote is not available
            position.currentValue = position.averagePrice * position.quantity
            position.profitLoss = 0
            position.profitLossPercent = 0
          }
        } catch (error) {
          console.warn(`Failed to get price for ${position.symbol}:`, error)
          position.currentValue = position.averagePrice * position.quantity
          position.profitLoss = 0
          position.profitLossPercent = 0
        }

        totalCurrentValue += position.currentValue || 0
        totalInvested += position.totalInvested
      }
    }

    const totalProfitLoss = totalCurrentValue - totalInvested
    const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0

    const portfolioSummary: PortfolioSummary = {
      totalValue: totalCurrentValue,
      totalInvested,
      totalProfitLoss,
      totalProfitLossPercent,
      availableBalance: user.virtualBalance,
      positions
    }

    return createResponse(200, portfolioSummary, 'Portfolio retrieved successfully')

  } catch (error) {
    console.error('Error getting portfolio:', error)
    return createErrorResponse(500, 'Failed to get portfolio', error)
  }
}

export const buyStock: ApiHandler = async (event) => {
  console.log('POST /users/{userId}/portfolio/buy request:', JSON.stringify(event, null, 2))

  try {
    const portfolioTable = process.env.PORTFOLIOS_TABLE
    const transactionsTable = process.env.TRANSACTIONS_TABLE
    const usersTable = process.env.USERS_TABLE
    
    if (!portfolioTable || !transactionsTable || !usersTable) {
      throw new Error('Required environment variables not set')
    }

    const userId = event.pathParameters?.userId
    if (!userId) {
      return createErrorResponse(400, 'userId path parameter is required')
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required')
    }

    const request: BuyStockRequest = JSON.parse(event.body)
    
    if (!request.symbol || !request.quantity || !request.price || request.quantity <= 0 || request.price <= 0) {
      return createErrorResponse(400, 'Valid symbol, quantity, and price are required')
    }

    // Get user to check balance
    const userResponse = await docClient.send(new GetCommand({
      TableName: usersTable,
      Key: { userId }
    }))

    if (!userResponse.Item) {
      return createErrorResponse(404, 'User not found')
    }

    const user = userResponse.Item as User
    const totalCost = request.quantity * request.price

    if (user.virtualBalance < totalCost) {
      return createErrorResponse(400, 'Insufficient balance')
    }

    // Get existing position
    const existingPosition = await docClient.send(new GetCommand({
      TableName: portfolioTable,
      Key: { userId, symbol: request.symbol }
    }))

    const now = new Date().toISOString()
    const transactionId = uuidv4()

    // Prepare transaction items
    const transactionItems = []

    // Update or create portfolio position
    if (existingPosition.Item) {
      const currentPosition = existingPosition.Item as Portfolio
      const newQuantity = currentPosition.quantity + request.quantity
      const newTotalInvested = currentPosition.totalInvested + totalCost
      const newAveragePrice = newTotalInvested / newQuantity

      transactionItems.push({
        Put: {
          TableName: portfolioTable,
          Item: {
            userId,
            symbol: request.symbol,
            quantity: newQuantity,
            averagePrice: newAveragePrice,
            totalInvested: newTotalInvested,
            lastUpdated: now
          }
        }
      })
    } else {
      transactionItems.push({
        Put: {
          TableName: portfolioTable,
          Item: {
            userId,
            symbol: request.symbol,
            quantity: request.quantity,
            averagePrice: request.price,
            totalInvested: totalCost,
            lastUpdated: now
          }
        }
      })
    }

    // Add transaction record
    transactionItems.push({
      Put: {
        TableName: transactionsTable,
        Item: {
          userId,
          transactionId,
          symbol: request.symbol,
          type: 'BUY',
          quantity: request.quantity,
          price: request.price,
          totalAmount: totalCost,
          timestamp: now,
          ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        }
      }
    })

    // Update user balance
    transactionItems.push({
      Put: {
        TableName: usersTable,
        Item: {
          ...user,
          virtualBalance: user.virtualBalance - totalCost,
          updatedAt: now
        }
      }
    })

    // Execute transaction
    await docClient.send(new TransactWriteCommand({
      TransactItems: transactionItems
    }))

    return createResponse(200, { transactionId }, 'Stock purchased successfully')

  } catch (error) {
    console.error('Error buying stock:', error)
    return createErrorResponse(500, 'Failed to buy stock', error)
  }
}

export const sellStock: ApiHandler = async (event) => {
  console.log('POST /users/{userId}/portfolio/sell request:', JSON.stringify(event, null, 2))

  try {
    const portfolioTable = process.env.PORTFOLIOS_TABLE
    const transactionsTable = process.env.TRANSACTIONS_TABLE
    const usersTable = process.env.USERS_TABLE
    
    if (!portfolioTable || !transactionsTable || !usersTable) {
      throw new Error('Required environment variables not set')
    }

    const userId = event.pathParameters?.userId
    if (!userId) {
      return createErrorResponse(400, 'userId path parameter is required')
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required')
    }

    const request: SellStockRequest = JSON.parse(event.body)
    
    if (!request.symbol || !request.quantity || !request.price || request.quantity <= 0 || request.price <= 0) {
      return createErrorResponse(400, 'Valid symbol, quantity, and price are required')
    }

    // Get existing position
    const existingPosition = await docClient.send(new GetCommand({
      TableName: portfolioTable,
      Key: { userId, symbol: request.symbol }
    }))

    if (!existingPosition.Item) {
      return createErrorResponse(404, 'No position found for this stock')
    }

    const currentPosition = existingPosition.Item as Portfolio

    if (currentPosition.quantity < request.quantity) {
      return createErrorResponse(400, 'Insufficient shares to sell')
    }

    // Get user
    const userResponse = await docClient.send(new GetCommand({
      TableName: usersTable,
      Key: { userId }
    }))

    if (!userResponse.Item) {
      return createErrorResponse(404, 'User not found')
    }

    const user = userResponse.Item as User
    const totalProceeds = request.quantity * request.price
    const soldInvestment = (currentPosition.totalInvested / currentPosition.quantity) * request.quantity

    const now = new Date().toISOString()
    const transactionId = uuidv4()

    // Prepare transaction items
    const transactionItems = []

    // Update portfolio position
    const newQuantity = currentPosition.quantity - request.quantity
    if (newQuantity > 0) {
      const newTotalInvested = currentPosition.totalInvested - soldInvestment

      transactionItems.push({
        Put: {
          TableName: portfolioTable,
          Item: {
            userId,
            symbol: request.symbol,
            quantity: newQuantity,
            averagePrice: currentPosition.averagePrice, // Keep same average price
            totalInvested: newTotalInvested,
            lastUpdated: now
          }
        }
      })
    } else {
      // Remove position entirely
      transactionItems.push({
        Delete: {
          TableName: portfolioTable,
          Key: { userId, symbol: request.symbol }
        }
      })
    }

    // Add transaction record
    transactionItems.push({
      Put: {
        TableName: transactionsTable,
        Item: {
          userId,
          transactionId,
          symbol: request.symbol,
          type: 'SELL',
          quantity: request.quantity,
          price: request.price,
          totalAmount: totalProceeds,
          timestamp: now,
          ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        }
      }
    })

    // Update user balance
    transactionItems.push({
      Put: {
        TableName: usersTable,
        Item: {
          ...user,
          virtualBalance: user.virtualBalance + totalProceeds,
          updatedAt: now
        }
      }
    })

    // Execute transaction
    await docClient.send(new TransactWriteCommand({
      TransactItems: transactionItems
    }))

    return createResponse(200, { 
      transactionId,
      profitLoss: totalProceeds - soldInvestment
    }, 'Stock sold successfully')

  } catch (error) {
    console.error('Error selling stock:', error)
    return createErrorResponse(500, 'Failed to sell stock', error)
  }
}

export const getTransactions: ApiHandler = async (event) => {
  console.log('GET /users/{userId}/transactions request:', JSON.stringify(event, null, 2))

  try {
    const tableName = process.env.TRANSACTIONS_TABLE
    if (!tableName) {
      throw new Error('TRANSACTIONS_TABLE environment variable not set')
    }

    const userId = event.pathParameters?.userId
    if (!userId) {
      return createErrorResponse(400, 'userId path parameter is required')
    }

    const limit = event.queryStringParameters?.limit ? 
      Math.min(parseInt(event.queryStringParameters.limit), 100) : 50

    const response = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit
    }))

    const transactions = (response.Items || []) as Transaction[]

    return createResponse(200, transactions, 'Transactions retrieved successfully')

  } catch (error) {
    console.error('Error getting transactions:', error)
    return createErrorResponse(500, 'Failed to get transactions', error)
  }
}