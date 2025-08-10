import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi'
import { WebSocketHandler, Connection, WebSocketMessage } from '../types/index'

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

// WebSocket Connect Handler
export const connect: WebSocketHandler = async (event) => {
  console.log('WebSocket connect:', JSON.stringify(event, null, 2))

  try {
    const connectionId = event.requestContext.connectionId!
    const tableName = process.env.METADATA_TABLE!

    const connection: Connection = {
      connectionId,
      timestamp: new Date().toISOString(),
      subscriptions: []
    }

    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        key: `connection:${connectionId}`,
        ...connection,
        ttl: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hour TTL
      }
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected successfully' })
    }
  } catch (error) {
    console.error('Connect error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to connect' })
    }
  }
}

// WebSocket Disconnect Handler
export const disconnect: WebSocketHandler = async (event) => {
  console.log('WebSocket disconnect:', JSON.stringify(event, null, 2))

  try {
    const connectionId = event.requestContext.connectionId!
    const tableName = process.env.METADATA_TABLE!

    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: {
        key: `connection:${connectionId}`
      }
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected successfully' })
    }
  } catch (error) {
    console.error('Disconnect error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to disconnect' })
    }
  }
}

// WebSocket Message Handler
export const message: WebSocketHandler = async (event) => {
  console.log('WebSocket message:', JSON.stringify(event, null, 2))

  try {
    const connectionId = event.requestContext.connectionId!
    const domainName = event.requestContext.domainName!
    const stage = event.requestContext.stage!
    
    // Parse the message
    let messageData: WebSocketMessage
    try {
      messageData = JSON.parse(event.body || '{}')
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON message' })
      }
    }

    const { action, symbol, type } = messageData

    // Create API Gateway Management API client
    const apiGatewayClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${domainName}/${stage}`
    })

    switch (action) {
      case 'subscribe':
        await handleSubscribe(connectionId, symbol, type, apiGatewayClient)
        break
      case 'unsubscribe':
        await handleUnsubscribe(connectionId, symbol, type, apiGatewayClient)
        break
      case 'ping':
        await sendToConnection(apiGatewayClient, connectionId, { 
          type: 'pong', 
          timestamp: new Date().toISOString() 
        })
        break
      default:
        await sendToConnection(apiGatewayClient, connectionId, { 
          error: `Unknown action: ${action}` 
        })
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Message processed successfully' })
    }
  } catch (error) {
    console.error('Message error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process message' })
    }
  }
}

// Helper function to handle subscription
async function handleSubscribe(
  connectionId: string, 
  symbol: string | undefined, 
  type: string | undefined,
  apiGatewayClient: ApiGatewayManagementApiClient
) {
  const tableName = process.env.METADATA_TABLE!

  try {
    // Get existing connection
    const response = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { key: `connection:${connectionId}` }
    }))

    const connection = response.Item as Connection | undefined
    if (!connection) {
      await sendToConnection(apiGatewayClient, connectionId, { 
        error: 'Connection not found' 
      })
      return
    }

    // Add subscription
    const subscription = type === 'movers' ? 'movers' : `ticker:${symbol}`
    const subscriptions = [...(connection.subscriptions || []), subscription]
    const uniqueSubscriptions = [...new Set(subscriptions)]

    // Update connection with new subscriptions
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        ...connection,
        key: `connection:${connectionId}`,
        subscriptions: uniqueSubscriptions,
        ttl: Math.floor(Date.now() / 1000) + (2 * 60 * 60)
      }
    }))

    await sendToConnection(apiGatewayClient, connectionId, { 
      type: 'subscribed', 
      subscription,
      timestamp: new Date().toISOString()
    })

    // Send initial data
    if (type === 'movers') {
      await sendMoversData(apiGatewayClient, connectionId)
    } else if (symbol) {
      await sendTickerData(apiGatewayClient, connectionId, symbol)
    }

  } catch (error) {
    console.error('Subscribe error:', error)
    await sendToConnection(apiGatewayClient, connectionId, { 
      error: 'Failed to subscribe' 
    })
  }
}

// Helper function to handle unsubscription
async function handleUnsubscribe(
  connectionId: string, 
  symbol: string | undefined, 
  type: string | undefined,
  apiGatewayClient: ApiGatewayManagementApiClient
) {
  const tableName = process.env.METADATA_TABLE!

  try {
    // Get existing connection
    const response = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { key: `connection:${connectionId}` }
    }))

    const connection = response.Item as Connection | undefined
    if (!connection) {
      await sendToConnection(apiGatewayClient, connectionId, { 
        error: 'Connection not found' 
      })
      return
    }

    // Remove subscription
    const subscription = type === 'movers' ? 'movers' : `ticker:${symbol}`
    const subscriptions = (connection.subscriptions || []).filter(s => s !== subscription)

    // Update connection
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        ...connection,
        key: `connection:${connectionId}`,
        subscriptions,
        ttl: Math.floor(Date.now() / 1000) + (2 * 60 * 60)
      }
    }))

    await sendToConnection(apiGatewayClient, connectionId, { 
      type: 'unsubscribed', 
      subscription,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Unsubscribe error:', error)
    await sendToConnection(apiGatewayClient, connectionId, { 
      error: 'Failed to unsubscribe' 
    })
  }
}

// Helper function to send movers data
async function sendMoversData(apiGatewayClient: ApiGatewayManagementApiClient, connectionId: string) {
  // Mock movers data - in production this would come from DynamoDB
  const mockMovers = [
    { symbol: 'AAPL', price: 180.50, change: 2.30, changePercent: 1.29, volume: 45000000 },
    { symbol: 'MSFT', price: 420.75, change: 8.50, changePercent: 2.06, volume: 32000000 },
    { symbol: 'GOOGL', price: 2750.80, change: -15.20, changePercent: -0.55, volume: 1200000 }
  ]

  await sendToConnection(apiGatewayClient, connectionId, {
    type: 'movers',
    data: mockMovers,
    timestamp: new Date().toISOString()
  })
}

// Helper function to send ticker data
async function sendTickerData(apiGatewayClient: ApiGatewayManagementApiClient, connectionId: string, symbol: string) {
  // Mock ticker data - in production this would come from DynamoDB
  const mockTicker = {
    symbol,
    price: 180.50 + (Math.random() - 0.5) * 10,
    change: (Math.random() - 0.5) * 5,
    changePercent: (Math.random() - 0.5) * 3,
    volume: Math.floor(Math.random() * 50000000) + 10000000
  }

  await sendToConnection(apiGatewayClient, connectionId, {
    type: 'ticker',
    data: mockTicker,
    timestamp: new Date().toISOString()
  })
}

// Helper function to send message to connection
async function sendToConnection(
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionId: string,
  data: any
) {
  try {
    await apiGatewayClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    }))
  } catch (error: any) {
    if (error.statusCode === 410) {
      console.log(`Connection ${connectionId} is stale, removing...`)
      // Connection is stale, remove it from metadata table
      await docClient.send(new DeleteCommand({
        TableName: process.env.METADATA_TABLE!,
        Key: { key: `connection:${connectionId}` }
      }))
    } else {
      console.error('Error sending message to connection:', error)
      throw error
    }
  }
}