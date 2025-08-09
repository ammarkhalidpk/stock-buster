import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { handler } from '../src/handlers/movers.js'

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

describe('Movers Handler', () => {
  let mockSend: any

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MOVERS_TABLE = 'test-movers-table'
    
    mockSend = vi.fn()
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')
    DynamoDBDocumentClient.from.mockReturnValue({ send: mockSend })
  })

  const createMockEvent = (queryParams?: Record<string, string>): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: '/movers',
    pathParameters: null,
    queryStringParameters: queryParams || null,
    headers: {},
    body: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '/movers'
  })

  it('returns mock data when DynamoDB has no items', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.data).toHaveLength(4)
    expect(body.data[0]).toHaveProperty('symbol')
    expect(body.data[0]).toHaveProperty('exchange')
    expect(body.data[0]).toHaveProperty('sector')
    expect(body.data[0]).toHaveProperty('rank')
    expect(body.message).toContain('DAILY movers for ASX')
  })

  it('uses correct partition key for query', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent({ period: 'DAILY', exchange: 'NASDAQ' })
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          KeyConditionExpression: 'pk = :pk',
          ExpressionAttributeValues: expect.objectContaining({
            ':pk': 'PERIOD#DAILY#EX#NASDAQ'
          })
        })
      })
    )
  })

  it('applies sector filter', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent({ sector: 'Technology' })
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          FilterExpression: 'sector = :sector',
          ExpressionAttributeValues: expect.objectContaining({
            ':sector': 'Technology'
          })
        })
      })
    )
  })

  it('filters gainers only', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent({ gainers: 'true' })
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          FilterExpression: 'changePercent > :zero',
          ExpressionAttributeValues: expect.objectContaining({
            ':zero': 0
          })
        })
      })
    )
  })

  it('filters losers only', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent({ losers: 'true' })
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          FilterExpression: 'changePercent < :zero',
          ExpressionAttributeValues: expect.objectContaining({
            ':zero': 0
          })
        })
      })
    )
  })

  it('combines sector and gainers filters', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent({ sector: 'Technology', gainers: 'true' })
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          FilterExpression: 'sector = :sector AND changePercent > :zero',
          ExpressionAttributeValues: expect.objectContaining({
            ':sector': 'Technology',
            ':zero': 0
          })
        })
      })
    )
  })

  it('respects limit parameter', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent({ limit: '10' })
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Limit: 10
        })
      })
    )
  })

  it('caps limit at 100', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent({ limit: '200' })
    await handler(event)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Limit: 100
        })
      })
    )
  })

  it('processes real DynamoDB data correctly', async () => {
    const mockItems = [
      {
        pk: 'PERIOD#DAILY#EX#ASX',
        sk: 'RANK#0001#SYMB#BHP.AX',
        symbol: 'BHP.AX',
        exchange: 'ASX',
        sector: 'Materials',
        price: 45.20,
        change: 2.30,
        changePercent: 5.36,
        volume: 12500000,
        rank: 1,
        timestamp: '2023-12-01T08:30:00Z'
      }
    ]
    
    mockSend.mockResolvedValue({ Items: mockItems })

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toEqual({
      symbol: 'BHP.AX',
      exchange: 'ASX',
      sector: 'Materials',
      price: 45.20,
      change: 2.30,
      changePercent: 5.36,
      volume: 12500000,
      rank: 1,
      timestamp: '2023-12-01T08:30:00Z'
    })
  })

  it('handles DynamoDB errors', async () => {
    mockSend.mockRejectedValue(new Error('DynamoDB error'))

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(500)
    const body = JSON.parse(result.body)
    expect(body.error).toBe('Failed to fetch market movers')
  })

  it('handles missing environment variable', async () => {
    delete process.env.MOVERS_TABLE

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(500)
    const body = JSON.parse(result.body)
    expect(body.error).toBe('Failed to fetch market movers')
  })

  it('returns CORS headers', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*')
    expect(result.headers).toHaveProperty('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  })

  it('generates appropriate mock data for different exchanges', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const asx = createMockEvent({ exchange: 'ASX' })
    const asxResult = await handler(asx)
    const asxBody = JSON.parse(asxResult.body)
    expect(asxBody.data[0].symbol).toContain('.AX')

    const nasdaq = createMockEvent({ exchange: 'NASDAQ' })
    const nasdaqResult = await handler(nasdaq)
    const nasdaqBody = JSON.parse(nasdaqResult.body)
    expect(asxBody.data[0].symbol).not.toContain('.')
  })
})