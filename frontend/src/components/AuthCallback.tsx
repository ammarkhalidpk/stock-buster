import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')

      if (error) {
        console.error('OAuth error:', error)
        navigate('/login?error=' + error)
        return
      }

      if (code) {
        try {
          // For now, just redirect to dashboard
          // In a full implementation, you'd exchange the code for tokens
          console.log('OAuth authorization code received:', code)
          
          // Clear URL and redirect to dashboard
          window.history.replaceState({}, document.title, '/')
          navigate('/')
        } catch (error) {
          console.error('Error processing OAuth callback:', error)
          navigate('/login?error=callback_failed')
        }
      } else {
        // No code parameter, just redirect to dashboard
        navigate('/')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Processing authentication...</p>
      </div>
    </div>
  )
}