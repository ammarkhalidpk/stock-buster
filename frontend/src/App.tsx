import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Movers from './pages/Movers'
import Ticker from './pages/Ticker'
import StockDetails from './pages/StockDetails'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="movers" element={<Movers />} />
          <Route path="ticker" element={<Ticker />} />
          <Route path="stock/:symbol" element={<StockDetails />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App