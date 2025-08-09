import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { handler } from '../src/handlers/bars.js'

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb')
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn()
    }))
  },
  QueryCommand: vi.fn()
}))

describe('Bars Handler', () => {
  let mockSend: any

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BARS_DAILY_TABLE = 'test-bars-daily'
    process.env.BARS_INTRADAY_TABLE = 'test-bars-intraday'
    
    mockSend = vi.fn()
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')
    DynamoDBDocumentClient.from.mockReturnValue({ send: mockSend })
  })

  const createMockEvent = (
    symbol: string,
    queryParams?: Record<string, string>
  ): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: `/bars/${symbol}`,
    pathParameters: { symbol },
    queryStringParameters: queryParams || null,
    headers: {},
    body: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '/bars/{symbol}'
  })

  it('returns mock data for valid symbol', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent('AAPL')
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.data).toHaveLength(10)
    expect(body.data[0]).toHaveProperty('symbol', 'AAPL')
    expect(body.data[0]).toHaveProperty('open')
    expect(body.data[0]).toHaveProperty('high')
    expect(body.data[0]).toHaveProperty('low')
    expect(body.data[0]).toHaveProperty('close')
    expect(body.message).toBe('daily bars for AAPL retrieved successfully')
  })

  it('returns 400 for missing symbol', async () => {
    const event = createMockEvent('')
    event.pathParameters = null

    const result = await handler(event)

    expect(result.statusCode).toBe(400)
    const body = JSON.parse(result.body)
    expect(body.error).toBe('Symbol path parameter is required')
  })

  it('handles intraday timeframe', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent('AAPL', { timeframe: 'intraday' })
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          TableName: 'test-bars-intraday'
        })
      })
    )
  })

  it('uses daily table by default', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent('AAPL')
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          TableName: 'test-bars-daily'
        })
      })
    )
  })

  it('converts symbol to uppercase', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent('aapl')
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ':symbol': 'AAPL'
          })
        })
      })
    )
  })

  it('applies date range filters', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent('AAPL', {
      startDate: '2023-01-01',
      endDate: '2023-12-31'
    })
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          KeyConditionExpression: expect.stringContaining('BETWEEN')
        })
      })
    )
  })
})