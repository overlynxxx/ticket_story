import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import TicketSelection from './pages/TicketSelection'
import Payment from './pages/Payment'
import TicketView from './pages/TicketView'
import ticketsConfig from '../config/tickets.json'

function App() {
  const [webApp, setWebApp] = useState(null)

  useEffect(() => {
    // Инициализация Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()
      setWebApp(tg)
    } else {
      // Для разработки вне Telegram
      console.log('Telegram WebApp не обнаружен, работаем в режиме разработки')
    }
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home webApp={webApp} config={ticketsConfig} />} />
        <Route path="/select/:categoryId" element={<TicketSelection webApp={webApp} config={ticketsConfig} />} />
        <Route path="/payment/:categoryId" element={<Payment webApp={webApp} config={ticketsConfig} />} />
        <Route path="/ticket/:ticketId" element={<TicketView webApp={webApp} config={ticketsConfig} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
