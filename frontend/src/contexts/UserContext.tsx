import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authUtils, userAPI, User, AuthUser } from '../lib/auth'

interface UserContextType {
  user: User | null
  authUser: AuthUser | null
  loading: boolean
  error: string | null
  login: () => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkAuthState = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const currentUser = await authUtils.getCurrentUser()
      
      if (currentUser) {
        const authUserData: AuthUser = {
          userId: currentUser.userId,
          username: currentUser.username,
          attributes: {
            email: currentUser.signInDetails?.loginId || '',
            given_name: currentUser.signInDetails?.authFlowType || '',
            family_name: ''
          }
        }
        
        setAuthUser(authUserData)

        // Try to get user data from our API
        try {
          const userData = await userAPI.getUser(currentUser.userId)
          setUser(userData)
        } catch (userError) {
          console.log('User not found in database, creating new user...')
          try {
            const newUser = await userAPI.createUser(authUserData)
            setUser(newUser)
          } catch (createError) {
            console.error('Failed to create user:', createError)
            setError('Failed to create user account')
          }
        }
      } else {
        setAuthUser(null)
        setUser(null)
      }
    } catch (error) {
      console.log('No authenticated user')
      setAuthUser(null)
      setUser(null)
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    if (authUser) {
      try {
        const userData = await userAPI.getUser(authUser.userId)
        setUser(userData)
      } catch (error) {
        console.error('Failed to refresh user data:', error)
      }
    }
  }

  const login = () => {
    // This will be handled by the Amplify UI components
    window.location.href = '/login'
  }

  const logout = async () => {
    try {
      await authUtils.signOut()
      setUser(null)
      setAuthUser(null)
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    checkAuthState()

    // Listen for auth state changes
    const handleStorageChange = () => {
      checkAuthState()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const value: UserContextType = {
    user,
    authUser,
    loading,
    error,
    login,
    logout,
    refreshUser
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser(): UserContextType {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}