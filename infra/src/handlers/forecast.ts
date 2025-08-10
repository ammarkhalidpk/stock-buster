import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { ApiHandler, createResponse, createErrorResponse, Forecast } from '../types/index'

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

export const handler: ApiHandler = async (event) => {
  console.log('GET /forecast/{symbol} request:', JSON.stringify(event, null, 2))

  try {
    const symbol = event.pathParameters?.symbol?.toUpperCase()
    if (!symbol) {
      return createErrorResponse(400, 'Symbol path parameter is required')
    }

    const tableName = process.env.FORECASTS_TABLE
    if (!tableName) {
      throw new Error('FORECASTS_TABLE environment variable not set')
    }

    // Get query parameters
    const horizon = event.queryStringParameters?.horizon || '30d' // 1d, 7d, 30d, 90d
    const includeAll = event.queryStringParameters?.all === 'true'

    let forecasts: Forecast[] = []

    if (includeAll) {
      // Query all horizons for this symbol
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'symbol = :symbol',
        ExpressionAttributeValues: {
          ':symbol': symbol
        },
        ScanIndexForward: false
      })

      const response = await docClient.send(command)
      forecasts = response.Items as Forecast[] || []
    } else {
      // Get specific horizon
      const command = new GetCommand({
        TableName: tableName,
        Key: {
          symbol,
          horizon
        }
      })

      const response = await docClient.send(command)
      if (response.Item) {
        forecasts = [response.Item as Forecast]
      }
    }

    // Mock data if no real data exists (for development)
    if (forecasts.length === 0) {
      const basePrice = 180 + (Math.random() - 0.5) * 40
      const horizons = includeAll ? ['1d', '7d', '30d', '90d'] : [horizon]
      
      forecasts = horizons.map(h => {
        const multiplier = h === '1d' ? 1.001 : h === '7d' ? 1.02 : h === '30d' ? 1.08 : 1.15
        const confidence = h === '1d' ? 0.95 : h === '7d' ? 0.85 : h === '30d' ? 0.75 : 0.60
        
        return {
          symbol,
          target: Number((basePrice * (multiplier + (Math.random() - 0.5) * 0.1)).toFixed(2)),
          confidence: Number((confidence + (Math.random() - 0.5) * 0.1).toFixed(2)),
          horizon: h,
          timestamp: new Date().toISOString()
        }
      })
    }

    const result = includeAll ? forecasts : (forecasts[0] || null)
    const message = includeAll 
      ? `All forecasts for ${symbol} retrieved successfully`
      : `${horizon} forecast for ${symbol} retrieved successfully`

    return createResponse(200, result, message)

  } catch (error) {
    console.error('Error fetching forecast:', error)
    return createErrorResponse(500, 'Failed to fetch price forecast', error)
  }
}