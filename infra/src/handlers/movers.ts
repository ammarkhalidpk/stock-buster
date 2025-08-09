import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { ApiHandler, createResponse, createErrorResponse, Mover } from '../types/index'

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

export const handler: ApiHandler = async (event) => {
  console.log('GET /movers request:', JSON.stringify(event, null, 2))

  try {
    const tableName = process.env.MOVERS_TABLE
    if (!tableName) {
      throw new Error('MOVERS_TABLE environment variable not set')
    }

    // Get query parameters with defaults
    const period = event.queryStringParameters?.period || 'DAILY' // DAILY, WEEKLY, MONTHLY
    const exchange = event.queryStringParameters?.exchange || 'ASX' // ASX, NASDAQ, LSE, etc.
    const sector = event.queryStringParameters?.sector // Optional sector filter
    const limit = event.queryStringParameters?.limit ? Math.min(parseInt(event.queryStringParameters.limit), 100) : 20
    const gainersOnly = event.queryStringParameters?.gainers === 'true'
    const losersOnly = event.queryStringParameters?.losers === 'true'

    console.log(`Fetching movers: period=${period}, exchange=${exchange}, sector=${sector}, limit=${limit}`)

    // Construct partition key
    const pk = `PERIOD#${period.toUpperCase()}#EX#${exchange.toUpperCase()}`

    // Query the movers table using the new schema
    const queryParams: any = {
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': pk
      },
      Limit: limit,
      ScanIndexForward: true // Get by rank ascending (best movers first)
    }

    // Add sector filter if specified
    if (sector) {
      queryParams.FilterExpression = 'sector = :sector'
      queryParams.ExpressionAttributeValues[':sector'] = sector
    }

    // Add gainers/losers filter
    if (gainersOnly) {
      const filterExpr = queryParams.FilterExpression ? `${queryParams.FilterExpression} AND changePercent > :zero` : 'changePercent > :zero'
      queryParams.FilterExpression = filterExpr
      queryParams.ExpressionAttributeValues[':zero'] = 0
    } else if (losersOnly) {
      const filterExpr = queryParams.FilterExpression ? `${queryParams.FilterExpression} AND changePercent < :zero` : 'changePercent < :zero'
      queryParams.FilterExpression = filterExpr
      queryParams.ExpressionAttributeValues[':zero'] = 0
    }

    const response = await docClient.send(new QueryCommand(queryParams))
    let movers: Mover[] = (response.Items || []).map(item => ({
      symbol: item.symbol,
      exchange: item.exchange,
      sector: item.sector,
      price: item.price,
      change: item.change,
      changePercent: item.changePercent,
      volume: item.volume,
      rank: item.rank,
      timestamp: item.timestamp
    }))

    // Mock data if no real data exists (for development)
    if (movers.length === 0) {
      console.log('No data found, returning mock data')
      movers = generateMockData(exchange, limit, gainersOnly, losersOnly, sector)
    }

    const message = `${period} movers for ${exchange}${sector ? ` in ${sector} sector` : ''} retrieved successfully`
    return createResponse(200, movers, message)

  } catch (error) {
    console.error('Error fetching movers:', error)
    return createErrorResponse(500, 'Failed to fetch market movers', error)
  }
}

function generateMockData(
  exchange: string, 
  limit: number, 
  gainersOnly: boolean, 
  losersOnly: boolean, 
  sector?: string
): Mover[] {
  
  const mockData: Mover[] = [
    {
      symbol: exchange === 'ASX' ? 'BHP.AX' : 'AAPL',
      exchange,
      sector: sector || 'Materials',
      price: 45.20,
      change: 2.30,
      changePercent: 5.36,
      volume: 12500000,
      rank: 1,
      timestamp: new Date().toISOString()
    },
    {
      symbol: exchange === 'ASX' ? 'CBA.AX' : 'MSFT',
      exchange,
      sector: sector || 'Financials',
      price: 102.50,
      change: 4.20,
      changePercent: 4.27,
      volume: 8900000,
      rank: 2,
      timestamp: new Date().toISOString()
    },
    {
      symbol: exchange === 'ASX' ? 'CSL.AX' : 'GOOGL',
      exchange,
      sector: sector || 'Healthcare',
      price: 275.80,
      change: -8.50,
      changePercent: -2.99,
      volume: 1200000,
      rank: 3,
      timestamp: new Date().toISOString()
    },
    {
      symbol: exchange === 'ASX' ? 'WES.AX' : 'TSLA',
      exchange,
      sector: sector || 'Consumer Staples',
      price: 58.45,
      change: -3.20,
      changePercent: -5.19,
      volume: 5600000,
      rank: 4,
      timestamp: new Date().toISOString()
    }
  ]

  // Apply filters
  let filteredData = mockData
  if (gainersOnly) {
    filteredData = filteredData.filter(m => m.changePercent > 0)
  } else if (losersOnly) {
    filteredData = filteredData.filter(m => m.changePercent < 0)
  }

  // Apply sector filter
  if (sector) {
    filteredData = filteredData.filter(m => m.sector === sector)
  }

  return filteredData.slice(0, limit)
}