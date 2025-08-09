import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Movers from '../src/pages/Movers'

// Mock fetch
global.fetch = vi.fn()

const mockFetch = vi.mocked(fetch)

describe('Movers', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('renders movers page title', () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithRouter(<Movers />)
    
    expect(screen.getByText('Market Movers')).toBeInTheDocument()
  })

  it('displays filter dropdown', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithRouter(<Movers />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('All Movers')).toBeInTheDocument()
    })
  })

  it('displays movers table with headers', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithRouter(<Movers />)
    
    await waitFor(() => {
      expect(screen.getByText('Symbol')).toBeInTheDocument()
      expect(screen.getByText('Price')).toBeInTheDocument()
      expect(screen.getByText('Change')).toBeInTheDocument()
      expect(screen.getByText('Change %')).toBeInTheDocument()
      expect(screen.getByText('Volume')).toBeInTheDocument()
    })
  })

  it('filters gainers when dropdown changed', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithRouter(<Movers />)
    
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })

    const dropdown = screen.getByDisplayValue('All Movers')
    fireEvent.change(dropdown, { target: { value: 'gainers' } })
    
    // TSLA has negative change, should be filtered out
    expect(screen.queryByText('TSLA')).not.toBeInTheDocument()
  })

  it('shows stock count', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithRouter(<Movers />)
    
    await waitFor(() => {
      expect(screen.getByText(/Showing \d+ stocks/)).toBeInTheDocument()
    })
  })
})