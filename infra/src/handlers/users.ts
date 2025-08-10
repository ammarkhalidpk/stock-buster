import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { ApiHandler, createResponse, createErrorResponse } from '../types/index'
import { User, CreateUserRequest } from '../types/user'
import { v4 as uuidv4 } from 'uuid'

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

export const createUser: ApiHandler = async (event) => {
  console.log('POST /users request:', JSON.stringify(event, null, 2))

  try {
    const tableName = process.env.USERS_TABLE
    if (!tableName) {
      throw new Error('USERS_TABLE environment variable not set')
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required')
    }

    const request: CreateUserRequest = JSON.parse(event.body)
    
    if (!request.email || !request.cognitoUserId) {
      return createErrorResponse(400, 'Email and cognitoUserId are required')
    }

    // Check if user already exists
    const existingUser = await docClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': request.email
      }
    }))

    if (existingUser.Items && existingUser.Items.length > 0) {
      return createErrorResponse(409, 'User with this email already exists')
    }

    const userId = uuidv4()
    const now = new Date().toISOString()

    const user: User = {
      userId,
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      virtualBalance: 100000, // Start with $100,000 virtual money
      createdAt: now,
      updatedAt: now,
      cognitoUserId: request.cognitoUserId
    }

    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: user,
      ConditionExpression: 'attribute_not_exists(userId)'
    }))

    return createResponse(201, user, 'User created successfully')

  } catch (error) {
    console.error('Error creating user:', error)
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return createErrorResponse(409, 'User already exists')
    }
    return createErrorResponse(500, 'Failed to create user', error)
  }
}

export const getUser: ApiHandler = async (event) => {
  console.log('GET /users/{userId} request:', JSON.stringify(event, null, 2))

  try {
    const tableName = process.env.USERS_TABLE
    if (!tableName) {
      throw new Error('USERS_TABLE environment variable not set')
    }

    const userId = event.pathParameters?.userId
    if (!userId) {
      return createErrorResponse(400, 'userId path parameter is required')
    }

    const response = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { userId }
    }))

    if (!response.Item) {
      return createErrorResponse(404, 'User not found')
    }

    const user = response.Item as User

    return createResponse(200, user, 'User retrieved successfully')

  } catch (error) {
    console.error('Error getting user:', error)
    return createErrorResponse(500, 'Failed to get user', error)
  }
}

export const updateUserBalance: ApiHandler = async (event) => {
  console.log('PUT /users/{userId}/balance request:', JSON.stringify(event, null, 2))

  try {
    const tableName = process.env.USERS_TABLE
    if (!tableName) {
      throw new Error('USERS_TABLE environment variable not set')
    }

    const userId = event.pathParameters?.userId
    if (!userId) {
      return createErrorResponse(400, 'userId path parameter is required')
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required')
    }

    const { balance } = JSON.parse(event.body)
    if (typeof balance !== 'number' || balance < 0) {
      return createErrorResponse(400, 'Valid balance is required')
    }

    const now = new Date().toISOString()

    // Update user balance
    const updateResponse = await docClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        userId,
        virtualBalance: balance,
        updatedAt: now
      },
      ConditionExpression: 'attribute_exists(userId)'
    }))

    // Get updated user
    const getUserResponse = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { userId }
    }))

    if (!getUserResponse.Item) {
      return createErrorResponse(404, 'User not found')
    }

    return createResponse(200, getUserResponse.Item, 'User balance updated successfully')

  } catch (error) {
    console.error('Error updating user balance:', error)
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return createErrorResponse(404, 'User not found')
    }
    return createErrorResponse(500, 'Failed to update user balance', error)
  }
}