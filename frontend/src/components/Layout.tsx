import { Link, Outlet } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

export default function Layout() {
  const { user, loading, logout } = useUser()
  
  // Debug logging to see what Layout component receives
  console.log('🎯 Layout render:', { user, loading, userEmail: user?.email, balance: user?.virtualBalance })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
                Stock Buster
              </Link>
            </div>
            <div className="flex space-x-8 items-center">
              <Link 
                to="/" 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link 
                to="/movers" 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Movers
              </Link>
              {user && (
                <>
                  <Link 
                    to="/portfolio" 
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Portfolio
                  </Link>
                  <Link 
                    to="/watchlist" 
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Watchlist
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              ) : user ? (
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{user.email}</span>
                    <br />
                    <span className="text-xs text-green-600">
                      ${user.virtualBalance.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}