import { EventBridgeEvent } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, BatchWriteCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { YahooFinanceService } from '../services/yahooFinance'

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

// Popular symbols to track
const TRACKED_SYMBOLS = [
  // US Tech
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
  // US Finance
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP',
  // US Others
  'BRK-B', 'JNJ', 'UNH', 'HD', 'DIS', 'PG', 'KO', 'PEP',
  // ASX Top stocks
  'CBA.AX', 'BHP.AX', 'CSL.AX', 'ANZ.AX', 'WBC.AX', 'NAB.AX', 
  'WES.AX', 'TLS.AX', 'WOW.AX', 'MQG.AX', 'RIO.AX', 'FMG.AX',
  'TCL.AX', 'ALL.AX', 'WDS.AX', 'GMG.AX', 'REA.AX', 'COH.AX'
]

export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log('Market data fetch started:', JSON.stringify(event, null, 2))

  const barsDailyTable = process.env.BARS_DAILY_TABLE
  const barsIntradayTable = process.env.BARS_INTRADAY_TABLE
  const moversTable = process.env.MOVERS_TABLE

  if (!barsDailyTable || !barsIntradayTable || !moversTable) {
    throw new Error('Required environment variables not set')
  }

  try {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timestampStr = now.toISOString()

    // Fetch quotes for all tracked symbols
    console.log(`Fetching quotes for ${TRACKED_SYMBOLS.length} symbols`)
    const quotes = await YahooFinanceService.getMultipleQuotes(TRACKED_SYMBOLS)
    console.log(`Received ${quotes.length} valid quotes`)

    if (quotes.length === 0) {
      console.warn('No quotes received from Yahoo Finance')
      return {
        statusCode: 200,
        message: 'No data received from Yahoo Finance'
      }
    }

    // Store intraday data
    await storeIntradayData(barsIntradayTable, quotes, timestampStr)

    // Store/update daily data
    await storeDailyData(barsDailyTable, quotes, dateStr)

    // Calculate and store movers
    await calculateAndStoreMovers(moversTable, quotes, timestampStr)

    console.log('Market data fetch completed successfully')
    return {
      statusCode: 200,
      message: `Successfully processed ${quotes.length} quotes`,
      processed: quotes.length,
      timestamp: timestampStr
    }

  } catch (error) {
    console.error('Error fetching market data:', error)
    throw error
  }
}

async function storeIntradayData(
  tableName: string,
  quotes: any[],
  timestamp: string
): Promise<void> {
  const batchSize = 25
  
  for (let i = 0; i < quotes.length; i += batchSize) {
    const batch = quotes.slice(i, i + batchSize)
    
    const putRequests = batch.map(quote => ({
      PutRequest: {
        Item: {
          symbol: quote.symbol,
          timestamp,
          open: quote.regularMarketPrice, // For intraday, we use current price
          high: quote.regularMarketPrice,
          low: quote.regularMarketPrice,
          close: quote.regularMarketPrice,
          volume: quote.regularMarketVolume || 0,
          ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
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
  
  console.log(`Stored ${quotes.length} intraday records`)
}

async function storeDailyData(
  tableName: string,
  quotes: any[],
  date: string
): Promise<void> {
  // For daily data, we need to fetch historical data for proper OHLC
  for (const quote of quotes) {
    try {
      // Get today's historical data
      const historicalData = await YahooFinanceService.getHistoricalData(
        quote.symbol,
        '1d',
        '1d'
      )
      
      if (historicalData && historicalData.timestamp && historicalData.indicators.quote[0]) {
        const dayData = historicalData.indicators.quote[0]
        const lastIndex = historicalData.timestamp.length - 1
        
        if (lastIndex >= 0 && dayData.open[lastIndex]) {
          await docClient.send(new PutCommand({
            TableName: tableName,
            Item: {
              symbol: quote.symbol,
              date,
              open: dayData.open[lastIndex],
              high: dayData.high[lastIndex],
              low: dayData.low[lastIndex],
              close: dayData.close[lastIndex] || quote.regularMarketPrice,
              volume: dayData.volume[lastIndex] || quote.regularMarketVolume || 0,
              exchange: YahooFinanceService.getExchange(quote.symbol),
              sector: YahooFinanceService.getSector(quote.symbol),
              ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
            }
          }))
        }
      } else {
        // Fallback: use quote data if historical not available
        await docClient.send(new PutCommand({
          TableName: tableName,
          Item: {
            symbol: quote.symbol,
            date,
            open: quote.regularMarketPrice,
            high: quote.regularMarketPrice,
            low: quote.regularMarketPrice,
            close: quote.regularMarketPrice,
            volume: quote.regularMarketVolume || 0,
            exchange: YahooFinanceService.getExchange(quote.symbol),
            sector: YahooFinanceService.getSector(quote.symbol),
            ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
          }
        }))
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.warn(`Failed to store daily data for ${quote.symbol}:`, error)
    }
  }
  
  console.log(`Updated daily data for ${quotes.length} symbols`)
}

async function calculateAndStoreMovers(
  tableName: string,
  quotes: any[],
  timestamp: string
): Promise<void> {
  // Convert quotes to movers with ranking
  const movers = quotes
    .map(quote => ({
      symbol: quote.symbol,
      exchange: YahooFinanceService.getExchange(quote.symbol),
      sector: YahooFinanceService.getSector(quote.symbol),
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume || 0,
      marketCap: quote.marketCap || 0,
      timestamp
    }))
    .filter(m => m.changePercent !== 0) // Filter out unchanged stocks
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))

  // Group by exchange and store
  const exchanges = [...new Set(movers.map(m => m.exchange))]
  
  for (const exchange of exchanges) {
    const exchangeMovers = movers
      .filter(m => m.exchange === exchange)
      .slice(0, 50) // Top 50 per exchange
    
    await storeMoversForExchange(tableName, exchange, exchangeMovers, 'INTRADAY')
  }
  
  // Store top movers across all exchanges
  const topMovers = movers.slice(0, 100)
  await storeMoversForExchange(tableName, 'ALL', topMovers, 'INTRADAY')
  
  console.log(`Stored movers for ${exchanges.length} exchanges`)
}

async function storeMoversForExchange(
  tableName: string,
  exchange: string,
  movers: any[],
  period: string
): Promise<void> {
  const pk = `PERIOD#${period}#EX#${exchange}`
  const batchSize = 25
  
  for (let i = 0; i < movers.length; i += batchSize) {
    const batch = movers.slice(i, i + batchSize)
    
    const putRequests = batch.map((mover, index) => ({
      PutRequest: {
        Item: {
          pk,
          sk: `RANK#${(i + index + 1).toString().padStart(4, '0')}#SYMB#${mover.symbol}`,
          ...mover,
          rank: i + index + 1,
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
}