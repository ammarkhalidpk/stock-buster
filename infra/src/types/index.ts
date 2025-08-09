import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyWebsocketEventV2, APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda'

export interface ApiResponse<T = unknown> {
  data: T
  timestamp: string
  source: string
  message?: string
}

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

export interface Connection {
  connectionId: string
  timestamp: string
  subscriptions?: string[]
}

export interface WebSocketMessage {
  action: string
  symbol?: string
  type?: string
}

export type ApiHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
export type WebSocketHandler = APIGatewayProxyWebsocketHandlerV2

export const createResponse = <T>(
  statusCode: number,
  data: T,
  message?: string
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  },
  body: JSON.stringify({
    data,
    timestamp: new Date().toISOString(),
    source: 'stock-buster-api',
    ...(message ? { message } : {})
  } as ApiResponse<T>)
})

export const createErrorResponse = (
  statusCode: number,
  error: string,
  details?: unknown
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  },
  body: JSON.stringify({
    error,
    timestamp: new Date().toISOString(),
    source: 'stock-buster-api',
    ...(details ? { details } : {})
  })
})