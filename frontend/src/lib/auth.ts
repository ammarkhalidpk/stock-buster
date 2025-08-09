import { Amplify } from 'aws-amplify'
import { getCurrentUser, signOut, signIn, signUp, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth'

// Configure Amplify
const authConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_placeholder',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'placeholder',
      identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_OAUTH_DOMAIN,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [window.location.origin],
          redirectSignOut: [window.location.origin],
          responseType: 'code'
        }
      }
    }
  }
}

// Only configure if we have the required environment variables
if (import.meta.env.VITE_USER_POOL_ID && import.meta.env.VITE_USER_POOL_CLIENT_ID) {
  Amplify.configure(authConfig)
}

// Auth utilities
export const authUtils = {
  getCurrentUser,
  signOut,
  signIn,
  signUp,
  confirmSignUp,
  resendSignUpCode
}

// Types
export interface User {
  userId: string
  email: string
  firstName?: string
  lastName?: string
  virtualBalance: number
  createdAt: string
  updatedAt: string
  cognitoUserId: string
}

export interface AuthUser {
  userId: string
  username: string
  attributes: {
    email: string
    given_name?: string
    family_name?: string
  }
}

// API utilities for user management
export const userAPI = {
  async createUser(cognitoUser: AuthUser): Promise<User> {
    const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cognitoUser.attributes.email,
        firstName: cognitoUser.attributes.given_name,
        lastName: cognitoUser.attributes.family_name,
        cognitoUserId: cognitoUser.userId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create user')
    }

    const result = await response.json()
    return result.data
  },

  async getUser(userId: string): Promise<User> {
    const response = await fetch(`${import.meta.env.VITE_API_URL_REST}/users/${userId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get user')
    }

    const result = await response.json()
    return result.data
  }
}