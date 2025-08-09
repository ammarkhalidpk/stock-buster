import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { UserProvider } from './contexts/UserContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Movers from './pages/Movers'
import Ticker from './pages/Ticker'
import StockDetails from './pages/StockDetails'
import Portfolio from './pages/Portfolio'
import Watchlist from './pages/Watchlist'
import Login from './pages/Login'

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="movers" element={<Movers />} />
            <Route path="ticker" element={<Ticker />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="watchlist" element={<Watchlist />} />
            <Route path="stock/:symbol" element={<StockDetails />} />
          </Route>
          <Route path="login" element={<Login />} />
        </Routes>
      </Router>
    </UserProvider>
  )
}

export default App