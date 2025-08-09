import { EventBridgeEvent } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

interface BarData {
  symbol: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  exchange?: string
  sector?: string
}

interface MoverData {
  symbol: string
  exchange: string
  sector: string
  price: number
  change: number
  changePercent: number
  volume: number
  rank: number
  timestamp: string
}

export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log('Daily movers calculation started:', JSON.stringify(event, null, 2))

  try {
    const barsDailyTable = process.env.BARS_DAILY_TABLE
    const moversTable = process.env.MOVERS_TABLE
    
    if (!barsDailyTable || !moversTable) {
      throw new Error('Required environment variables not set')
    }

    // Get today and yesterday dates
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    console.log(`Processing dates: ${yesterdayStr} -> ${todayStr}`)

    // Get all symbols with data for both days
    const moversData = await calculateDailyMovers(barsDailyTable, todayStr, yesterdayStr)
    
    if (moversData.length === 0) {
      console.log('No movers data calculated')
      return { statusCode: 200, message: 'No data to process' }
    }

    // Group by exchange and write to DynamoDB
    const exchanges = [...new Set(moversData.map(m => m.exchange))]
    
    for (const exchange of exchanges) {
      const exchangeMovers = moversData
        .filter(m => m.exchange === exchange)
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 100) // Top 100 movers per exchange
        .map((mover, index) => ({ ...mover, rank: index + 1 }))

      await writeMoversToTable(moversTable, exchange, exchangeMovers, todayStr)
    }

    console.log(`Processed ${moversData.length} movers across ${exchanges.length} exchanges`)
    
    return {
      statusCode: 200,
      message: `Successfully calculated daily movers for ${exchanges.length} exchanges`,
      processed: moversData.length,
      exchanges: exchanges.length
    }

  } catch (error) {
    console.error('Error calculating daily movers:', error)
    throw error
  }
}

async function calculateDailyMovers(
  tableName: string, 
  todayStr: string, 
  yesterdayStr: string
): Promise<MoverData[]> {
  
  // Get all symbols
  const symbolsResponse = await docClient.send(new ScanCommand({
    TableName: tableName,
    FilterExpression: '#date = :today',
    ExpressionAttributeNames: { '#date': 'date' },
    ExpressionAttributeValues: { ':today': todayStr },
    ProjectionExpression: 'symbol, exchange, sector'
  }))

  const symbols = symbolsResponse.Items || []
  console.log(`Found ${symbols.length} symbols for ${todayStr}`)

  const moversData: MoverData[] = []

  // Process symbols in batches to avoid throttling
  const batchSize = 25
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (symbolData) => {
      try {
        const symbol = symbolData.symbol
        const exchange = symbolData.exchange || extractExchangeFromSymbol(symbol)
        const sector = symbolData.sector || 'Unknown'

        // Get today's and yesterday's data
        const [todayData, yesterdayData] = await Promise.all([
          getBarData(tableName, symbol, todayStr),
          getBarData(tableName, symbol, yesterdayStr)
        ])

        if (!todayData || !yesterdayData) {
          return null // Skip if missing data
        }

        const change = todayData.close - yesterdayData.close
        const changePercent = (change / yesterdayData.close) * 100

        // Only include significant movers (> 1% change)
        if (Math.abs(changePercent) >= 1.0) {
          return {
            symbol,
            exchange,
            sector,
            price: todayData.close,
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            volume: todayData.volume,
            rank: 0, // Will be set later
            timestamp: new Date().toISOString()
          } as MoverData
        }

        return null
      } catch (error) {
        console.warn(`Error processing symbol ${symbolData.symbol}:`, error)
        return null
      }
    })

    const batchResults = await Promise.all(batchPromises)
    const validResults = batchResults.filter(result => result !== null) as MoverData[]
    moversData.push(...validResults)

    // Small delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return moversData
}

async function getBarData(tableName: string, symbol: string, date: string): Promise<BarData | null> {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'symbol = :symbol AND #date = :date',
      ExpressionAttributeNames: { '#date': 'date' },
      ExpressionAttributeValues: {
        ':symbol': symbol,
        ':date': date
      },
      Limit: 1
    }))

    return response.Items?.[0] as BarData || null
  } catch (error) {
    console.warn(`Error fetching bar data for ${symbol} on ${date}:`, error)
    return null
  }
}

async function writeMoversToTable(
  tableName: string,
  exchange: string,
  movers: MoverData[],
  date: string
): Promise<void> {
  
  const period = 'DAILY'
  const pk = `PERIOD#${period}#EX#${exchange}`
  
  // Delete existing data for this period/exchange
  await deleteExistingMovers(tableName, pk)
  
  // Batch write new data
  const batchSize = 25
  for (let i = 0; i < movers.length; i += batchSize) {
    const batch = movers.slice(i, i + batchSize)
    
    const putRequests = batch.map(mover => ({
      PutRequest: {
        Item: {
          pk,
          sk: `RANK#${mover.rank.toString().padStart(4, '0')}#SYMB#${mover.symbol}`,
          symbol: mover.symbol,
          exchange: mover.exchange,
          sector: mover.sector,
          price: mover.price,
          change: mover.change,
          changePercent: mover.changePercent,
          volume: mover.volume,
          rank: mover.rank,
          date,
          timestamp: mover.timestamp,
          ttl: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days TTL
        }
      }
    }))

    if (putRequests.length > 0) {
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: putRequests
        }
      }))
    }
  }

  console.log(`Wrote ${movers.length} movers for ${exchange} exchange`)
}

async function deleteExistingMovers(tableName: string, pk: string): Promise<void> {
  try {
    // Query existing items
    const response = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': pk },
      ProjectionExpression: 'pk, sk'
    }))

    const items = response.Items || []
    if (items.length === 0) return

    // Delete in batches
    const batchSize = 25
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      
      const deleteRequests = batch.map(item => ({
        DeleteRequest: {
          Key: {
            pk: item.pk,
            sk: item.sk
          }
        }
      }))

      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: deleteRequests
        }
      }))
    }

    console.log(`Deleted ${items.length} existing movers for ${pk}`)
  } catch (error) {
    console.warn('Error deleting existing movers:', error)
    // Continue execution even if delete fails
  }
}

function extractExchangeFromSymbol(symbol: string): string {
  // Extract exchange from symbol suffix (e.g., BHP.AX -> ASX)
  const parts = symbol.split('.')
  if (parts.length > 1) {
    const suffix = parts[parts.length - 1].toUpperCase()
    const exchangeMap: { [key: string]: string } = {
      'AX': 'ASX',
      'L': 'LSE',
      'T': 'TSE',
      'HK': 'HKEX',
      'SS': 'SSE',
      'SZ': 'SZSE'
    }
    return exchangeMap[suffix] || suffix
  }
  return 'NASDAQ' // Default for US stocks without suffix
}