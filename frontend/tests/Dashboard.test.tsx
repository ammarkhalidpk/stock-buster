import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Dashboard from '../src/pages/Dashboard'

// Mock fetch
global.fetch = vi.fn()

const mockFetch = vi.mocked(fetch)

describe('Dashboard', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('renders dashboard title', () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithRouter(<Dashboard />)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithRouter(<Dashboard />)
    
    expect(screen.getByText('Loading market data...')).toBeInTheDocument()
  })

  it('displays mock data when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithRouter(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('GOOGL')).toBeInTheDocument()
    })
  })

  it('displays market stats cards', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithRouter(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Top Gainer')).toBeInTheDocument()
      expect(screen.getByText('Top Loser')).toBeInTheDocument()
      expect(screen.getByText('Active Stocks')).toBeInTheDocument()
    })
  })

  it('displays data delay warning', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithRouter(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('• Data may be delayed')).toBeInTheDocument()
    })
  })
})