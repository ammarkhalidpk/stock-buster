import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { EventBridgeEvent } from 'aws-lambda'
import { handler } from '../src/handlers/calcMoversDaily.js'

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb')
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn()
    }))
  },
  ScanCommand: vi.fn(),
  QueryCommand: vi.fn(),
  BatchWriteCommand: vi.fn()
}))

describe('CalcMoversDaily Handler', () => {
  let mockSend: any

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BARS_DAILY_TABLE = 'test-bars-daily'
    process.env.MOVERS_TABLE = 'test-movers'
    
    mockSend = vi.fn()
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')
    DynamoDBDocumentClient.from.mockReturnValue({ send: mockSend })
  })

  const createMockEvent = (): EventBridgeEvent<string, any> => ({
    version: '0',
    id: 'test-id',
    'detail-type': 'Scheduled Event',
    source: 'aws.events',
    account: '123456789012',
    time: '2023-12-01T08:30:00Z',
    region: 'us-east-1',
    detail: {},
    resources: []
  })

  it('processes daily movers calculation successfully', async () => {
    // Mock today's symbols scan
    mockSend
      .mockResolvedValueOnce({
        Items: [
          { symbol: 'BHP.AX', exchange: 'ASX', sector: 'Materials' },
          { symbol: 'CBA.AX', exchange: 'ASX', sector: 'Financials' }
        ]
      })
      // Mock today's bar data for BHP.AX
      .mockResolvedValueOnce({
        Items: [{ symbol: 'BHP.AX', date: '2023-12-01', close: 45.20, volume: 12000000 }]
      })
      // Mock yesterday's bar data for BHP.AX
      .mockResolvedValueOnce({
        Items: [{ symbol: 'BHP.AX', date: '2023-11-30', close: 43.50, volume: 11000000 }]
      })
      // Mock today's bar data for CBA.AX
      .mockResolvedValueOnce({
        Items: [{ symbol: 'CBA.AX', date: '2023-12-01', close: 102.50, volume: 8000000 }]
      })
      // Mock yesterday's bar data for CBA.AX
      .mockResolvedValueOnce({
        Items: [{ symbol: 'CBA.AX', date: '2023-11-30', close: 100.00, volume: 7500000 }]
      })
      // Mock delete existing movers query
      .mockResolvedValueOnce({ Items: [] })
      // Mock batch write
      .mockResolvedValueOnce({})

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.processed).toBe(2)
    expect(result.exchanges).toBe(1)
    expect(result.message).toContain('Successfully calculated daily movers')
  })

  it('handles no data scenario', async () => {
    // Mock empty symbols scan
    mockSend.mockResolvedValueOnce({ Items: [] })

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.message).toBe('No data to process')
  })

  it('filters out small movements', async () => {
    // Mock symbols scan
    mockSend
      .mockResolvedValueOnce({
        Items: [{ symbol: 'TEST.AX', exchange: 'ASX', sector: 'Test' }]
      })
      // Mock today's data
      .mockResolvedValueOnce({
        Items: [{ symbol: 'TEST.AX', date: '2023-12-01', close: 10.05, volume: 1000000 }]
      })
      // Mock yesterday's data (only 0.5% change - below 1% threshold)
      .mockResolvedValueOnce({
        Items: [{ symbol: 'TEST.AX', date: '2023-11-30', close: 10.00, volume: 1000000 }]
      })

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.message).toBe('No data to process')
  })

  it('handles missing environment variables', async () => {
    delete process.env.BARS_DAILY_TABLE

    const event = createMockEvent()
    
    await expect(handler(event)).rejects.toThrow('Required environment variables not set')
  })

  it('calculates correct percentage change', async () => {
    mockSend
      .mockResolvedValueOnce({
        Items: [{ symbol: 'TEST.AX', exchange: 'ASX', sector: 'Test' }]
      })
      // Today: $50.00
      .mockResolvedValueOnce({
        Items: [{ symbol: 'TEST.AX', date: '2023-12-01', close: 50.00, volume: 1000000 }]
      })
      // Yesterday: $40.00 (25% increase)
      .mockResolvedValueOnce({
        Items: [{ symbol: 'TEST.AX', date: '2023-11-30', close: 40.00, volume: 1000000 }]
      })
      .mockResolvedValueOnce({ Items: [] }) // Delete existing
      .mockResolvedValueOnce({}) // Batch write

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.processed).toBe(1)

    // Check that BatchWriteCommand was called with correct percentage
    const batchWriteCall = mockSend.mock.calls.find(call => 
      call[0].constructor.name === 'BatchWriteCommand'
    )
    expect(batchWriteCall).toBeDefined()
    
    const item = batchWriteCall[0].input.RequestItems['test-movers'][0].PutRequest.Item
    expect(item.changePercent).toBe(25.00)
    expect(item.change).toBe(10.00)
  })

  it('handles DynamoDB batch write failures gracefully', async () => {
    mockSend
      .mockResolvedValueOnce({
        Items: [{ symbol: 'TEST.AX', exchange: 'ASX', sector: 'Test' }]
      })
      .mockResolvedValueOnce({
        Items: [{ symbol: 'TEST.AX', date: '2023-12-01', close: 50.00, volume: 1000000 }]
      })
      .mockResolvedValueOnce({
        Items: [{ symbol: 'TEST.AX', date: '2023-11-30', close: 40.00, volume: 1000000 }]
      })
      .mockResolvedValueOnce({ Items: [] }) // Delete existing
      .mockRejectedValueOnce(new Error('BatchWrite failed')) // Batch write fails

    const event = createMockEvent()
    
    await expect(handler(event)).rejects.toThrow('BatchWrite failed')
  })

  it('correctly extracts exchange from symbol', async () => {
    mockSend
      .mockResolvedValueOnce({
        Items: [
          { symbol: 'MSFT', sector: 'Technology' }, // No exchange, no suffix
          { symbol: 'ASML.AS', sector: 'Technology' } // Amsterdam suffix
        ]
      })
      .mockResolvedValueOnce({
        Items: [{ symbol: 'MSFT', date: '2023-12-01', close: 420.00, volume: 10000000 }]
      })
      .mockResolvedValueOnce({
        Items: [{ symbol: 'MSFT', date: '2023-11-30', close: 400.00, volume: 9000000 }]
      })
      .mockResolvedValueOnce({
        Items: [{ symbol: 'ASML.AS', date: '2023-12-01', close: 650.00, volume: 500000 }]
      })
      .mockResolvedValueOnce({
        Items: [{ symbol: 'ASML.AS', date: '2023-11-30', close: 630.00, volume: 480000 }]
      })
      .mockResolvedValueOnce({ Items: [] }) // Delete NASDAQ
      .mockResolvedValueOnce({}) // Write NASDAQ
      .mockResolvedValueOnce({ Items: [] }) // Delete AS
      .mockResolvedValueOnce({}) // Write AS

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.exchanges).toBe(2) // NASDAQ and AS
  })
})