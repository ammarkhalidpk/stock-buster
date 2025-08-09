import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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
      
      // Check if we just came back from OAuth (temporary solution)
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      
      if (code) {
        // Simulate a successful OAuth login with mock user data
        const mockAuthUser: AuthUser = {
          userId: 'oauth-user-' + Date.now(),
          username: 'oauth.user@example.com',
          attributes: {
            email: 'oauth.user@example.com',
            given_name: 'OAuth',
            family_name: 'User'
          }
        }
        
        const mockUser: User = {
          userId: mockAuthUser.userId,
          email: mockAuthUser.attributes.email,
          firstName: mockAuthUser.attributes.given_name,
          lastName: mockAuthUser.attributes.family_name,
          virtualBalance: 100000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cognitoUserId: mockAuthUser.userId
        }
        
        setAuthUser(mockAuthUser)
        setUser(mockUser)
        
        // Clear the OAuth code from URL
        window.history.replaceState({}, document.title, window.location.pathname)
        
        setLoading(false)
        return
      }
      
      // Try to get current user from Amplify
      try {
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
      } catch (amplifyError) {
        console.log('No authenticated user from Amplify')
        setAuthUser(null)
        setUser(null)
        setError(null)
      }
    } catch (error) {
      console.log('Error checking auth state:', error)
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