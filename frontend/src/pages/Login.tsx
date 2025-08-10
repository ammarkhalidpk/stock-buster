import { useEffect } from 'react'
import { useUser } from '../contexts/UserContext'

export default function Login() {
  const { user, loading } = useUser()

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (user) {
      window.location.href = '/'
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to Stock Buster
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Virtual stock trading and portfolio management
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Sign in with your preferred account
              </p>
              
              <div className="space-y-4">
                <button
                  type="button"
                  className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    window.location.href = `https://stock-buster-dev-506194020427.auth.ap-southeast-2.amazoncognito.com/oauth2/authorize?identity_provider=Google&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&client_id=2fpnrvqlm4i7mqe6v3amqmh2i2&scope=email+openid+profile`
                  }}
                >
                  Continue with Google
                </button>
                
                <button
                  type="button"
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    window.location.href = `https://stock-buster-dev-506194020427.auth.ap-southeast-2.amazoncognito.com/oauth2/authorize?identity_provider=Facebook&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&client_id=2fpnrvqlm4i7mqe6v3amqmh2i2&scope=email+openid+profile`
                  }}
                >
                  Continue with Facebook
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    window.location.href = `https://stock-buster-dev-506194020427.auth.ap-southeast-2.amazoncognito.com/signup?response_type=code&client_id=2fpnrvqlm4i7mqe6v3amqmh2i2&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=email+openid+profile`
                  }}
                >
                  Create account with email
                </button>

                <div className="text-center">
                  <button
                    onClick={() => window.location.href = '/'}
                    className="text-blue-600 hover:text-blue-500 text-sm"
                  >
                    ← Back to Dashboard (Guest Mode)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}