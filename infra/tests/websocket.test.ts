import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda'
import { connect, disconnect, message } from '../src/handlers/websocket.js'

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb')
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn()
    }))
  },
  PutItemCommand: vi.fn(),
  DeleteItemCommand: vi.fn(),
  GetItemCommand: vi.fn()
}))
vi.mock('@aws-sdk/client-apigatewaymanagementapi', () => ({
  ApiGatewayManagementApiClient: vi.fn(() => ({
    send: vi.fn()
  })),
  PostToConnectionCommand: vi.fn()
}))

describe('WebSocket Handlers', () => {
  let mockSend: any
  let mockApiGatewaySend: any

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.METADATA_TABLE = 'test-metadata-table'
    
    mockSend = vi.fn()
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')
    DynamoDBDocumentClient.from.mockReturnValue({ send: mockSend })

    mockApiGatewaySend = vi.fn()
    const { ApiGatewayManagementApiClient } = require('@aws-sdk/client-apigatewaymanagementapi')
    ApiGatewayManagementApiClient.mockImplementation(() => ({
      send: mockApiGatewaySend
    }))
  })

  const createMockEvent = (
    connectionId: string,
    body?: string
  ): APIGatewayProxyWebsocketEventV2 => ({
    requestContext: {
      connectionId,
      domainName: 'test-domain.execute-api.us-east-1.amazonaws.com',
      stage: 'test',
      routeKey: '$connect'
    } as any,
    body: body || null,
    headers: {},
    isBase64Encoded: false,
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null
  })

  describe('connect', () => {
    it('stores connection in DynamoDB', async () => {
      mockSend.mockResolvedValue({})

      const event = createMockEvent('test-connection-id')
      const result = await connect(event)

      expect(result.statusCode).toBe(200)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-metadata-table',
            Item: expect.objectContaining({
              key: 'connection:test-connection-id',
              connectionId: 'test-connection-id',
              subscriptions: []
            })
          })
        })
      )
    })

    it('handles DynamoDB errors', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'))

      const event = createMockEvent('test-connection-id')
      const result = await connect(event)

      expect(result.statusCode).toBe(500)
    })
  })

  describe('disconnect', () => {
    it('removes connection from DynamoDB', async () => {
      mockSend.mockResolvedValue({})

      const event = createMockEvent('test-connection-id')
      const result = await disconnect(event)

      expect(result.statusCode).toBe(200)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-metadata-table',
            Key: {
              key: 'connection:test-connection-id'
            }
          })
        })
      )
    })
  })

  describe('message', () => {
    it('handles ping message', async () => {
      mockSend.mockResolvedValue({})
      mockApiGatewaySend.mockResolvedValue({})

      const event = createMockEvent('test-connection-id', JSON.stringify({ action: 'ping' }))
      const result = await message(event)

      expect(result.statusCode).toBe(200)
      expect(mockApiGatewaySend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ConnectionId: 'test-connection-id',
            Data: expect.stringContaining('pong')
          })
        })
      )
    })

    it('handles invalid JSON', async () => {
      const event = createMockEvent('test-connection-id', 'invalid json')
      const result = await message(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body!)
      expect(body.error).toBe('Invalid JSON message')
    })

    it('handles subscribe to movers', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          connectionId: 'test-connection-id',
          subscriptions: []
        }
      })
      mockSend.mockResolvedValueOnce({}) // For PutItem
      mockApiGatewaySend.mockResolvedValue({})

      const event = createMockEvent(
        'test-connection-id',
        JSON.stringify({ action: 'subscribe', type: 'movers' })
      )
      const result = await message(event)

      expect(result.statusCode).toBe(200)
      expect(mockApiGatewaySend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Data: expect.stringContaining('subscribed')
          })
        })
      )
    })

    it('handles unknown action', async () => {
      mockApiGatewaySend.mockResolvedValue({})

      const event = createMockEvent(
        'test-connection-id',
        JSON.stringify({ action: 'unknown' })
      )
      const result = await message(event)

      expect(result.statusCode).toBe(200)
      expect(mockApiGatewaySend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Data: expect.stringContaining('Unknown action')
          })
        })
      )
    })
  })
})