export interface Mover {
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

export interface Bar {
  symbol: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Forecast {
  symbol: string
  target: number
  confidence: number
  horizon: string
  timestamp: string
}

export interface ApiResponse<T> {
  data: T
  timestamp: string
  source: string
}