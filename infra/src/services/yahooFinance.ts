// Node.js 20 has built-in fetch, no import needed

export interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketTime: number;
  shortName: string;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  dividendYield?: number;
  beta?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  averageVolume?: number;
  sharesOutstanding?: number;
  bookValue?: number;
  priceToBook?: number;
  earningsPerShare?: number;
  revenue?: number;
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  sector?: string;
  industry?: string;
  fullExchangeName?: string;
  currency?: string;
  longName?: string;
}

export interface DetailedStockData extends YahooQuote {
  financialData?: {
    totalCash?: number;
    totalDebt?: number;
    totalRevenue?: number;
    grossProfits?: number;
    operatingCashflow?: number;
    freeCashflow?: number;
    returnOnAssets?: number;
    returnOnEquity?: number;
    debtToEquity?: number;
    currentRatio?: number;
    quickRatio?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
  };
  summaryDetail?: {
    previousClose?: number;
    open?: number;
    dayLow?: number;
    dayHigh?: number;
    fiftyTwoWeekLow?: number;
    fiftyTwoWeekHigh?: number;
    volume?: number;
    averageVolume?: number;
    marketCap?: number;
    beta?: number;
    trailingPE?: number;
    forwardPE?: number;
    dividendYield?: number;
    exDividendDate?: number;
    dividendRate?: number;
    payoutRatio?: number;
  };
}

export interface YahooHistoricalData {
  symbol: string;
  timestamp: number[];
  indicators: {
    quote: [{
      open: number[];
      high: number[];
      low: number[];
      close: number[];
      volume: number[];
    }];
  };
}

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export class YahooFinanceService {
  /**
   * Get detailed stock data including financials and key metrics
   */
  static async getDetailedStockData(symbol: string): Promise<DetailedStockData | null> {
    try {
      // Get basic quote data first
      const quote = await this.getQuote(symbol);
      if (!quote) return null;

      // Try to get detailed data from Yahoo Finance modules API
      const modules = 'price,summaryDetail,defaultKeyStatistics,financialData,assetProfile,calendarEvents';
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Detailed data not available for ${symbol}, returning basic quote`);
        return quote as DetailedStockData;
      }

      const data = await response.json() as any;
      const result = data?.quoteSummary?.result?.[0];
      
      if (!result) {
        console.warn(`No detailed data found for ${symbol}`);
        return quote as DetailedStockData;
      }

      // Extract detailed information
      const price = result.price || {};
      const summaryDetail = result.summaryDetail || {};
      const keyStats = result.defaultKeyStatistics || {};
      const financialData = result.financialData || {};
      const assetProfile = result.assetProfile || {};

      const detailedData: DetailedStockData = {
        ...quote,
        // Enhanced quote data
        longName: price.longName?.raw || price.shortName?.raw || quote.shortName,
        currency: price.currency?.raw || 'USD',
        sector: assetProfile.sector?.raw || this.getSector(symbol),
        industry: assetProfile.industry?.raw || 'Other',
        fullExchangeName: price.exchangeName?.raw || this.getExchange(symbol),
        
        // Summary metrics
        trailingPE: summaryDetail.trailingPE?.raw || keyStats.trailingPE?.raw,
        forwardPE: summaryDetail.forwardPE?.raw || keyStats.forwardPE?.raw,
        dividendYield: summaryDetail.dividendYield?.raw || keyStats.dividendYield?.raw,
        beta: summaryDetail.beta?.raw || keyStats.beta?.raw,
        bookValue: keyStats.bookValue?.raw,
        priceToBook: keyStats.priceToBook?.raw,
        earningsPerShare: keyStats.trailingEps?.raw,
        sharesOutstanding: keyStats.sharesOutstanding?.raw,
        
        // Market data
        fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow?.raw,
        fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh?.raw,
        regularMarketDayHigh: summaryDetail.dayHigh?.raw,
        regularMarketDayLow: summaryDetail.dayLow?.raw,
        regularMarketOpen: summaryDetail.open?.raw,
        regularMarketPreviousClose: summaryDetail.previousClose?.raw,
        averageVolume: summaryDetail.averageVolume?.raw,
        
        // Financial data
        financialData: {
          totalCash: financialData.totalCash?.raw,
          totalDebt: financialData.totalDebt?.raw,
          totalRevenue: financialData.totalRevenue?.raw,
          grossProfits: financialData.grossProfits?.raw,
          operatingCashflow: financialData.operatingCashflow?.raw,
          freeCashflow: financialData.freeCashflow?.raw,
          returnOnAssets: financialData.returnOnAssets?.raw,
          returnOnEquity: financialData.returnOnEquity?.raw,
          debtToEquity: financialData.debtToEquity?.raw,
          currentRatio: financialData.currentRatio?.raw,
          quickRatio: financialData.quickRatio?.raw,
          revenueGrowth: financialData.revenueGrowth?.raw,
          earningsGrowth: financialData.earningsGrowth?.raw,
        },

        // Summary detail (for easy access)
        summaryDetail: {
          previousClose: summaryDetail.previousClose?.raw,
          open: summaryDetail.open?.raw,
          dayLow: summaryDetail.dayLow?.raw,
          dayHigh: summaryDetail.dayHigh?.raw,
          fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow?.raw,
          fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh?.raw,
          volume: summaryDetail.volume?.raw,
          averageVolume: summaryDetail.averageVolume?.raw,
          marketCap: summaryDetail.marketCap?.raw,
          beta: summaryDetail.beta?.raw,
          trailingPE: summaryDetail.trailingPE?.raw,
          forwardPE: summaryDetail.forwardPE?.raw,
          dividendYield: summaryDetail.dividendYield?.raw,
          exDividendDate: summaryDetail.exDividendDate?.raw,
          dividendRate: summaryDetail.dividendRate?.raw,
          payoutRatio: summaryDetail.payoutRatio?.raw,
        }
      };

      return detailedData;
    } catch (error) {
      console.error(`Error fetching detailed data for ${symbol}:`, error);
      // Fallback to basic quote
      const quote = await this.getQuote(symbol);
      return quote as DetailedStockData;
    }
  }

  /**
   * Get real-time quote data for a symbol
   */
  static async getQuote(symbol: string): Promise<YahooQuote | null> {
    try {
      const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Yahoo Finance API error: ${response.status}`);
        return null;
      }

      const data = await response.json() as any;
      const result = data?.chart?.result?.[0];
      
      if (!result) {
        console.error('No data returned from Yahoo Finance');
        return null;
      }

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];
      
      if (!meta || !quote) {
        console.error('Invalid data structure from Yahoo Finance');
        return null;
      }

      // Get the latest values
      const latestIndex = quote.close.length - 1;
      const currentPrice = quote.close[latestIndex];
      const previousClose = meta.previousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        symbol: meta.symbol,
        regularMarketPrice: currentPrice,
        regularMarketChange: change,
        regularMarketChangePercent: changePercent,
        regularMarketVolume: quote.volume[latestIndex] || 0,
        regularMarketTime: result.timestamp[latestIndex],
        shortName: meta.symbol,
        marketCap: meta.marketCap
      };
    } catch (error) {
      console.error('Error fetching Yahoo Finance quote:', error);
      return null;
    }
  }

  /**
   * Get historical data for a symbol
   */
  static async getHistoricalData(
    symbol: string, 
    period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' = '1mo',
    interval: '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo' = '1d'
  ): Promise<YahooHistoricalData | null> {
    try {
      const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}?period1=0&period2=9999999999&interval=${interval}&range=${period}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Yahoo Finance API error: ${response.status}`);
        return null;
      }

      const data = await response.json() as any;
      const result = data?.chart?.result?.[0];
      
      if (!result) {
        return null;
      }

      return {
        symbol: result.meta.symbol,
        timestamp: result.timestamp,
        indicators: result.indicators
      };
    } catch (error) {
      console.error('Error fetching Yahoo Finance historical data:', error);
      return null;
    }
  }

  /**
   * Get multiple quotes at once
   */
  static async getMultipleQuotes(symbols: string[]): Promise<YahooQuote[]> {
    const promises = symbols.map(symbol => this.getQuote(symbol));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<YahooQuote | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value as YahooQuote);
  }

  /**
   * Get trending/popular stocks - using a predefined list of popular symbols
   */
  static async getTrendingStocks(): Promise<YahooQuote[]> {
    const popularSymbols = [
      'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
      'BRK-B', 'JPM', 'JNJ', 'V', 'PG', 'UNH', 'HD', 'MA',
      // ASX stocks
      'CBA.AX', 'BHP.AX', 'CSL.AX', 'ANZ.AX', 'WBC.AX', 'NAB.AX', 'WES.AX', 'TLS.AX'
    ];

    return await this.getMultipleQuotes(popularSymbols);
  }

  /**
   * Extract exchange from symbol
   */
  static getExchange(symbol: string): string {
    if (symbol.endsWith('.AX')) return 'ASX';
    if (symbol.endsWith('.L')) return 'LSE';
    if (symbol.endsWith('.TO')) return 'TSE';
    if (symbol.endsWith('.HK')) return 'HKEX';
    return 'NASDAQ'; // Default for US stocks
  }

  /**
   * Determine sector based on symbol (simplified mapping)
   */
  static getSector(symbol: string): string {
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'GOOGL': 'Technology',
      'MSFT': 'Technology',
      'AMZN': 'Consumer Discretionary',
      'TSLA': 'Automotive',
      'META': 'Technology',
      'NVDA': 'Technology',
      'NFLX': 'Entertainment',
      'BRK-B': 'Financial',
      'JPM': 'Financial',
      'JNJ': 'Healthcare',
      'V': 'Financial',
      'PG': 'Consumer Staples',
      'UNH': 'Healthcare',
      'HD': 'Retail',
      'MA': 'Financial',
      'CBA.AX': 'Financial',
      'BHP.AX': 'Materials',
      'CSL.AX': 'Healthcare',
      'ANZ.AX': 'Financial',
      'WBC.AX': 'Financial',
      'NAB.AX': 'Financial',
      'WES.AX': 'Consumer Staples',
      'TLS.AX': 'Telecommunications'
    };

    return sectorMap[symbol] || 'Other';
  }
}